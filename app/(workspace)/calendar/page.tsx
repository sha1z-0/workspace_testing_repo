"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Loader2, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users, Calendar as CalendarIcon, Mail, UserPlus, Globe } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { notificationsAPI } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

// Define calendar event type
interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  type?: "event" | "meeting";
  attendees: string[];
  organizer: string;
  organizerEmail?: string;
  sendCalendarInvite?: boolean;
  sendEmailReminder?: boolean;
  addToGoogleCalendar?: boolean;
  notifyOnDashboard?: boolean;
  createdAt?: Timestamp;
}

// Email service for sending invites and reminders
const emailService = {
  sendMeetingInvite: async (
    to: string[],
    cc: string[],
    subject: string,
    meetingDetails: {
      title: string;
      description: string;
      startTime: Date;
      endTime: Date;
      location: string;
      meetingLink: string;
      organizer: string;
      organizerEmail: string;
    }
  ): Promise<{ success: boolean; sent?: number; failed?: number; error?: unknown }> => {
    try {
      const response = await fetch('/api/send-meeting-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          cc,
          subject,
          meetingDetails: {
            ...meetingDetails,
            startTime: meetingDetails.startTime.toISOString(),
            endTime: meetingDetails.endTime.toISOString(),
          }
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg = responseData.error || responseData.details || 'Failed to send email invitations';
        console.error('[SendGrid] API error:', errorMsg, responseData);
        return { success: false, sent: responseData.sent || 0, failed: responseData.failed || (to.length + cc.length), error: errorMsg };
      }

      return { success: true, sent: responseData.sent, failed: responseData.failed || 0 };
    } catch (error) {
      console.error('Error sending email invitations:', error);
      return { success: false, error };
    }
  }
};

// Google Calendar integration service
const googleCalendarService = {
  addEvent: async (eventDetails: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    location: string;
    attendees: string[];
  }) => {
    try {
      // Now connects to our real API endpoint
      const response = await fetch('/api/google-calendar/add-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventDetails,
          // Convert dates to strings for JSON serialization
          startTime: eventDetails.startTime.toISOString(),
          endTime: eventDetails.endTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add event to Google Calendar');
      }

      const result = await response.json();
      return { success: true, eventId: result.eventId };
    } catch (error) {
      console.error('Error adding event to Google Calendar:', error);
      return { success: false, error };
    }
  }
};

// Dashboard notification service
const dashboardService = {
  notifyUsers: async (emailAddresses: string[], notification: {
    title: string;
    content: string;
    type: string;
    linkTo?: string;
    eventId?: string;
  }) => {
    try {
      // First get user IDs from email addresses using our new API
      const { usersAPI } = await import('@/lib/api');

      // Find users based on email addresses
      const users = await usersAPI.findUsersByEmails(emailAddresses);

      if (users.length === 0) {
        console.log(`No registered users found for emails: ${emailAddresses.join(', ')}`);
        return { success: true, notifiedCount: 0 };
      }

      console.log(`Found ${users.length} users to notify out of ${emailAddresses.length} email addresses`);

      // Now send notifications to each user
      const addNotificationPromises = users.map(user =>
        notificationsAPI.addNotification({
          userId: user.uid || user.id, // Use uid if available, otherwise use document id
          title: notification.title,
          body: notification.content,
          type: notification.type,
          linkTo: notification.linkTo || '/calendar',
          relatedItemId: notification.eventId,
        })
      );

      const results = await Promise.all(addNotificationPromises);

      return {
        success: true,
        notifiedCount: results.length,
        users: users.map(u => u.email)
      };
    } catch (error) {
      console.error('Error sending dashboard notifications:', error);
      return { success: false, error };
    }
  }
};

export default function CalendarPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<"day" | "week" | "month">("month")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false)

  // Event/meeting form state
  const [eventType, setEventType] = useState<"event" | "meeting">("event")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [location, setLocation] = useState("")
  const [meetingLink, setMeetingLink] = useState("")
  const [toEmails, setToEmails] = useState("")
  const [ccEmails, setCcEmails] = useState("")
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  // Integration options
  const [sendCalendarInvite, setSendCalendarInvite] = useState(true)
  const [sendEmailReminder, setSendEmailReminder] = useState(true)
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false)
  const [notifyOnDashboard, setNotifyOnDashboard] = useState(true)

  // State for storing events
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Real users data from database
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [invitedMembers, setInvitedMembers] = useState<string[]>([])

  // Fetch events and users from database on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Fetch all users for member selection and calendar events
        const { usersAPI, calendarEventsAPI } = await import('@/lib/api');
        const [users, calendarEvents] = await Promise.all([
          usersAPI.getAll(),
          calendarEventsAPI.getAll(user.id)
        ]);
        
        setAllUsers(users.filter(u => u.uid !== user.id)); // Exclude current user
        
        // Transform calendar events to match component state
        const transformedEvents = calendarEvents.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          location: event.location || '',
          type: event.type,
          attendees: event.attendees,
          organizer: event.organizerName || 'Unknown',
          organizerEmail: event.organizerEmail,
          sendCalendarInvite: event.sendCalendarInvite,
          sendEmailReminder: event.sendEmailReminder,
          addToGoogleCalendar: event.addToGoogleCalendar,
          notifyOnDashboard: event.notifyOnDashboard,
        }));
        
        setEvents(transformedEvents);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const getMonthData = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const monthData = getMonthData(date.getFullYear(), date.getMonth())

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handlePrevMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
  }

  // Function to save event to database
  const saveEventToDatabase = async (eventData: CalendarEvent) => {
    try {
      const { calendarEventsAPI } = await import('@/lib/api');
      
      const savedEvent = await calendarEventsAPI.createEvent({
        title: eventData.title,
        description: eventData.description,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: eventData.location,
        type: eventData.type || 'event',
        organizerId: user?.id || '',
        organizerName: user?.name,
        organizerEmail: user?.email,
        attendees: eventData.attendees || [],
        invitedMemberIds: invitedMembers,
        meetingLink: eventData.meetingLink,
        sendCalendarInvite: eventData.sendCalendarInvite,
        sendEmailReminder: eventData.sendEmailReminder,
        addToGoogleCalendar: eventData.addToGoogleCalendar,
        notifyOnDashboard: eventData.notifyOnDashboard,
      });
      
      console.log("Calendar event saved successfully:", savedEvent);
      return { id: savedEvent.id };
    } catch (error) {
      console.error("Error saving calendar event:", error);
      throw error;
    }
  };

  const handleCreateEvent = async () => {
    if (!["CEO", "C_LEVEL", "LEAD"].includes(user?.role || "")) {
      toast({
        title: "Access denied",
        description: "Only C-Level, Admin, and Lead accounts can create events.",
        variant: "destructive",
      })
      return
    }
    if (!title || !selectedDate || !startTime || !endTime) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setCreatingEvent(true)

      // Extract hours and minutes from time strings
      const [startHours, startMinutes] = startTime.split(':').map(Number)
      const [endHours, endMinutes] = endTime.split(':').map(Number)

      // Create Date objects for start and end times
      const startDate = new Date(selectedDate!)
      startDate.setHours(startHours, startMinutes)

      const endDate = new Date(selectedDate!)
      endDate.setHours(endHours, endMinutes)

      // Create new event object
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}`,
        title,
        description,
        startTime: startDate,
        endTime: endDate,
        location,
        type: eventType,
        attendees: [],
        organizer: user?.name || "Current User",
        organizerEmail: user?.email,
        sendCalendarInvite,
        sendEmailReminder,
        addToGoogleCalendar,
        notifyOnDashboard,
        meetingLink,
      }

      if (eventType === "meeting") {
        // For meetings, parse emails and add attendees
        const toList = toEmails.split(',').map(email => email.trim()).filter(Boolean)
        const ccList = ccEmails.split(',').map(email => email.trim()).filter(Boolean)

        // Add the event attendees
        newEvent.attendees = [...toList, ...ccList]

        // Save to database first
        const { id } = await saveEventToDatabase(newEvent);
        newEvent.id = id;

        // Send email invitations if enabled
        if (sendCalendarInvite) {
          const emailResult = await emailService.sendMeetingInvite(
            toList,
            ccList,
            `Meeting Invitation: ${title}`,
            {
              title,
              description,
              startTime: startDate,
              endTime: endDate,
              location,
              meetingLink,
              organizer: user?.name || "Current User",
              organizerEmail: user?.email || "",
            }
          );

          if (emailResult.success) {
            toast({
              title: "Meeting invites sent",
              description: `${emailResult.sent} sent, ${emailResult.failed} failed`,
            });
          } else {
            toast({
              title: "Meeting invite warning",
              description: `${emailResult.sent || 0} sent, ${emailResult.failed || 0} failed — check server logs`,
              variant: "destructive",
            });
          }
        }

        // Add to Google Calendar if enabled
        if (addToGoogleCalendar) {
          const result = await googleCalendarService.addEvent({
            title,
            description,
            startTime: startDate,
            endTime: endDate,
            location,
            attendees: [...toList, ...ccList],
          });

          if (result.success) {
            toast({
              title: "Added to Google Calendar",
              description: "Event has been added to your Google Calendar",
            });
          }
        }

        // Send dashboard notifications to invited members
        if (invitedMembers.length > 0) {
          const invitedMembersEmails = invitedMembers
            .map(userId => allUsers.find(u => u.uid === userId)?.email)
            .filter(Boolean) as string[];

          if (invitedMembersEmails.length > 0) {
            await dashboardService.notifyUsers(invitedMembersEmails, {
              title: `Meeting Invitation: ${title}`,
              content: `${user?.name || 'Someone'} has invited you to a meeting: ${title} on ${format(startDate, 'PPP')} at ${format(startDate, 'p')}`,
              type: "meeting",
              linkTo: `/calendar?event=${id}`,
              eventId: id,
            });

            toast({
              title: "Notifications sent",
              description: `${invitedMembersEmails.length} team member(s) notified`,
            });
          }
        }

        // Send dashboard notifications if enabled (for email attendees)
        if (notifyOnDashboard) {
          // Get user IDs for the attendees
          // Now using actual email addresses instead of mock user IDs
          const attendeeEmails = [...toList, ...ccList];

          if (attendeeEmails.length > 0) {
            await dashboardService.notifyUsers(attendeeEmails, {
              title: `New Meeting: ${title}`,
              content: `You have been invited to a meeting: ${title}`,
              type: "meeting",
              linkTo: `/calendar?event=${id}`,
              eventId: id,
            });
          }
        }
      } else {
        // For regular events
        // Save to database
        const { id } = await saveEventToDatabase(newEvent);
        newEvent.id = id;

        if (addToGoogleCalendar) {
          await googleCalendarService.addEvent({
            title,
            description,
            startTime: startDate,
            endTime: endDate,
            location,
            attendees: [],
          });
        }

        // Send notifications to invited members even for regular events
        if (invitedMembers.length > 0) {
          const invitedMembersEmails = invitedMembers
            .map(userId => allUsers.find(u => u.uid === userId)?.email)
            .filter(Boolean) as string[];

          if (invitedMembersEmails.length > 0) {
            await dashboardService.notifyUsers(invitedMembersEmails, {
              title: `Event Invitation: ${title}`,
              content: `${user?.name || 'Someone'} has invited you to an event: ${title} on ${format(startDate, 'PPP')} at ${format(startDate, 'p')}`,
              type: "event",
              linkTo: `/calendar?event=${id}`,
              eventId: id,
            });

            toast({
              title: "Notifications sent",
              description: `${invitedMembersEmails.length} team member(s) notified`,
            });
          }
        }
      }

      // Add the new event to our events list
      setEvents(prevEvents => [...prevEvents, newEvent])

      // Reset form and close dialog
      resetForm()
      setCreateDialogOpen(false)

      toast({
        title: "Success",
        description: `${eventType === "meeting" ? "Meeting" : "Event"} has been created.`,
      })

    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Failed to create the event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreatingEvent(false)
    }
  }

  const resetForm = () => {
    setEventType("event")
    setTitle("")
    setDescription("")
    setSelectedDate(new Date())
    setStartTime("09:00")
    setEndTime("10:00")
    setLocation("")
    setMeetingLink("")
    setToEmails("")
    setCcEmails("")
    setSelectedParticipants([])
    setInvitedMembers([])
    setSendCalendarInvite(true)
    setSendEmailReminder(true)
    setAddToGoogleCalendar(false)
    setNotifyOnDashboard(true)
  }

  const handleCCEmployeeSelect = (userId: string) => {
    const userToAdd = allUsers.find(u => u.uid === userId)
    if (userToAdd) {
      const emailList = ccEmails ? ccEmails.split(',').map(e => e.trim()) : []

      // Check if email is already in the list
      if (!emailList.includes(userToAdd.email)) {
        const newEmails = [...emailList, userToAdd.email].join(', ')
        setCcEmails(newEmails)
      }
    }
  }

  const handleMemberToggle = (userId: string) => {
    setInvitedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventDetailsOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Calendar</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Manage your schedule and events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-1 flex items-center border border-white/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("day")}
                className={cn(
                  "rounded-lg text-white hover:bg-white/20",
                  view === "day" && "bg-white/30 font-medium shadow-sm"
                )}
              >
                Day
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("week")}
                className={cn(
                  "rounded-lg text-white hover:bg-white/20",
                  view === "week" && "bg-white/30 font-medium shadow-sm"
                )}
              >
                Week
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("month")}
                className={cn(
                  "rounded-lg text-white hover:bg-white/20",
                  view === "month" && "bg-white/30 font-medium shadow-sm"
                )}
              >
                Month
              </Button>
            </div>

            {["CEO", "C_LEVEL", "LEAD"].includes(user?.role || "") && (
            <Button
              size="lg"
              onClick={() => setCreateDialogOpen(true)}
              className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none transition-all hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Event
            </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Calendar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-sm">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-xl font-semibold whitespace-nowrap px-2">
            {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => setDate(new Date())} className="bg-transparent border-primary/20 hover:bg-primary/10 hover:text-primary">
          Today
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-white/20 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl shadow-xl overflow-hidden"
      >
        {view === "month" && (
          <div className="overflow-x-auto">
            <div className="min-w-[800px] p-6">
              <div className="grid grid-cols-7 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center font-semibold text-muted-foreground py-2 uppercase text-xs tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {monthData.map((day, index) => {
                  const isToday = day &&
                    day.getDate() === new Date().getDate() &&
                    day.getMonth() === new Date().getMonth() &&
                    day.getFullYear() === new Date().getFullYear();

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[120px] rounded-2xl p-3 transition-all duration-200 border border-transparent",
                        day ? "bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-md hover:-translate-y-1" : "opacity-0",
                        isToday && "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/20"
                      )}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            "text-right font-medium text-sm mb-2 rounded-full w-7 h-7 flex items-center justify-center ml-auto",
                            isToday ? "bg-blue-600 text-white shadow-md" : "text-slate-600 dark:text-slate-300"
                          )}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1.5 max-h-[85px] overflow-y-auto no-scrollbar">
                            {getEventsForDate(day).map((event) => (
                              <div
                                key={event.id}
                                className={cn(
                                  "truncate rounded-lg px-2 py-1 text-xs cursor-pointer transition-colors font-medium border border-l-2 shadow-sm",
                                  event.type === 'meeting'
                                    ? "bg-purple-100/80 text-purple-700 border-l-purple-500 border-purple-200/50 hover:bg-purple-200/80"
                                    : "bg-blue-100/80 text-blue-700 border-l-blue-500 border-blue-200/50 hover:bg-blue-200/80"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                                title={`${event.title} (${formatTime(event.startTime)})`}
                              >
                                {formatTime(event.startTime)} {event.title}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {view === "day" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4"
        >
          <div className="p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20">
            <h3 className="mb-6 text-2xl font-semibold flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </h3>

            <div className="space-y-4">
              {getEventsForDate(date).length === 0 ? (
                <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/5 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <CalendarIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">No events scheduled</h3>
                  <p className="text-sm text-slate-500 mt-1">Create a new event to get started with your day</p>
                  <Button variant="link" onClick={() => setCreateDialogOpen(true)} className="mt-2 text-blue-600">
                    Schedule something
                  </Button>
                </div>
              ) : (
                getEventsForDate(date).map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ scale: 1.01, x: 4 }}
                    className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-800/60 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1.5",
                      event.type === 'meeting' ? "bg-purple-500" : "bg-blue-500"
                    )} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={cn(
                            "text-[10px] uppercase tracking-wider font-bold",
                            event.type === 'meeting' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {event.type === 'meeting' ? 'Meeting' : 'Event'}
                          </Badge>
                          <span className="text-xs text-slate-500 font-medium flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                          {event.title}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">{event.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        {event.location && (
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                            <MapPin className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                          <Users className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                          <span>{event.attendees.length} attendees</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Create Event/Meeting Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create New {eventType === "meeting" ? "Meeting" : "Event"}</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new {eventType === "meeting" ? "meeting" : "event"} on your calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={eventType}
                onValueChange={(value: "event" | "meeting") => setEventType(value)}
              >
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Schedule Event</SelectItem>
                  <SelectItem value="meeting">Schedule Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">{eventType === "meeting" ? "Meeting Name" : "Event Title"}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={eventType === "meeting" ? "Weekly Team Sync" : "Company Event"}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this event"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Meeting room, Zoom link, etc."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting-link">Meeting Link</Label>
              <Input
                id="meeting-link"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/... or https://zoom.us/..."
              />
            </div>

            {/* Invite Team Members Section - Available for both events and meetings */}
            <div className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-sm">Invite Team Members</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Selected members will receive a notification in their notification bell
              </p>
              
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
                {allUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No team members available</p>
                ) : (
                  allUsers.map(u => (
                    <div 
                      key={u.uid} 
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <Checkbox
                        id={`member-${u.uid}`}
                        checked={invitedMembers.includes(u.uid)}
                        onCheckedChange={() => handleMemberToggle(u.uid)}
                      />
                      <Label 
                        htmlFor={`member-${u.uid}`} 
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        <div className="flex items-center justify-between">
                          <span>{u.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {u.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </Label>
                    </div>
                  ))
                )}
              </div>

              {invitedMembers.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {invitedMembers.length} member(s) will be notified
                  </p>
                </div>
              )}
            </div>

            {eventType === "meeting" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="to-emails">To:</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <Input
                      id="to-emails"
                      value={toEmails}
                      onChange={(e) => setToEmails(e.target.value)}
                      placeholder="Enter email addresses separated by commas"
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recipients will receive a calendar invitation via email
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cc-emails">CC Employees:</Label>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <Input
                        id="cc-emails"
                        value={ccEmails}
                        onChange={(e) => setCcEmails(e.target.value)}
                        placeholder="CC recipients"
                        className="w-full"
                      />
                    </div>
                    <Select onValueChange={handleCCEmployeeSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers.map(u => (
                          <SelectItem key={u.uid} value={u.uid}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Display selected CC employees */}
                    {ccEmails && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-1">CC'd employees:</p>
                        <div className="flex flex-wrap gap-1">
                          {ccEmails.split(',').map((email, index) => (
                            email.trim() && (
                              <Badge key={index} variant="outline" className="text-xs">
                                {email.trim()}
                              </Badge>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meeting integration options */}
                <div className="border rounded-xl p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                  <h4 className="font-medium text-sm">Meeting Options</h4>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="send-calendar-invite"
                      checked={sendCalendarInvite}
                      onCheckedChange={(checked) => setSendCalendarInvite(checked === true)}
                      className="mt-1"
                    />
                    <Label htmlFor="send-calendar-invite" className="text-sm font-normal cursor-pointer">
                      Send calendar invitation to attendees
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="send-email-reminder"
                      checked={sendEmailReminder}
                      onCheckedChange={(checked) => setSendEmailReminder(checked === true)}
                      className="mt-1"
                    />
                    <Label htmlFor="send-email-reminder" className="text-sm font-normal cursor-pointer">
                      Send email reminder 15 minutes before meeting
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="add-to-google"
                      checked={addToGoogleCalendar}
                      onCheckedChange={(checked) => setAddToGoogleCalendar(checked === true)}
                      className="mt-1"
                    />
                    <Label htmlFor="add-to-google" className="text-sm font-normal cursor-pointer">
                      Add to Google Calendar
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="notify-dashboard"
                      checked={notifyOnDashboard}
                      onCheckedChange={(checked) => setNotifyOnDashboard(checked === true)}
                      className="mt-1"
                    />
                    <Label htmlFor="notify-dashboard" className="text-sm font-normal cursor-pointer">
                      Notify attendees on their dashboard
                    </Label>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingEvent} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={creatingEvent}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
            >
              {creatingEvent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : `Create ${eventType === "meeting" ? "Meeting" : "Event"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] rounded-3xl overflow-hidden p-0 border-0">
          {selectedEvent && (
            <div className="w-full">
              <div className={cn(
                "h-32 w-full relative flex items-center justify-center",
                selectedEvent.type === "meeting"
                  ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                  : "bg-gradient-to-br from-blue-500 to-cyan-500"
              )}>
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  {selectedEvent.type === "meeting"
                    ? <Users className="h-32 w-32" />
                    : <CalendarIcon className="h-32 w-32" />
                  }
                </div>
                <div className="z-10 text-center text-white px-6">
                  <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                  <div className="flex justify-center items-center gap-2 mt-2 text-white/80 text-sm">
                    <span className="bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {selectedEvent.type === "meeting" ? "Meeting" : "Event"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5 bg-white dark:bg-slate-900">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Clock className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedEvent.startTime.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <MapPin className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedEvent.location || "No location specified"}</p>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                    {selectedEvent.description}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">ORGANIZER</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {selectedEvent.organizer.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{selectedEvent.organizer}</span>
                    </div>
                  </div>

                  {selectedEvent.attendees.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">ATTENDEES ({selectedEvent.attendees.length})</p>
                      <div className="flex -space-x-2">
                        {selectedEvent.attendees.slice(0, 4).map((attendee, index) => (
                          <div key={index} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] overflow-hidden" title={attendee}>
                            {attendee.charAt(0)}
                          </div>
                        ))}
                        {selectedEvent.attendees.length > 4 && (
                          <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px]">
                            +{selectedEvent.attendees.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEventDetailsOpen(false)} className="flex-1 rounded-xl">
                    Close
                  </Button>
                  {(user?.role === "CEO" || user?.role === "C_LEVEL" || user?.role === "LEAD" || selectedEvent.organizer === user?.name) && (
                    <Button variant="destructive" className="flex-1 rounded-xl">
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
