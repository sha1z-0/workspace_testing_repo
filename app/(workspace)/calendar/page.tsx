"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
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
    setSelectedDate(undefined)
    setStartTime("")
    setEndTime("")
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
      className="space-y-4 min-h-screen p-1"
      style={{ background: "#0B0F1A" }}
    >
      {/* ─── Part A: Compact Hero ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#121826] p-5"
      >
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#3B82F6]/8 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-3 py-1 mb-2">
              <CalendarIcon className="h-3 w-3 text-[#93C5FD]" />
              <span className="text-[11px] font-semibold text-[#93C5FD] uppercase tracking-wider">Schedule</span>
            </div>
            <h1 className="text-[26px] font-semibold text-[#F1F5F9] tracking-tight">Calendar</h1>
            <p className="text-[#64748B] text-[13px] mt-0.5">Manage your schedule and events.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View switcher — pill style matching Tasks page */}
            <div className="flex gap-1 p-1 rounded-[10px] bg-[#0F1523] border border-white/[0.06]">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium capitalize transition-colors ${
                    view === v
                      ? "bg-white/10 text-[#F1F5F9]"
                      : "text-[#64748B] hover:text-[#CBD5E1]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* New Event button — UNCHANGED onClick */}
            {["CEO", "C_LEVEL", "LEAD"].includes(user?.role || "") && (
              <button
                type="button"
                onClick={() => setCreateDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Event
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-[8px] text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.06] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-[18px] font-semibold text-[#F1F5F9] px-2 whitespace-nowrap">
            {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-[8px] text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.06] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDate(new Date())}
          className="px-3 py-1.5 rounded-[8px] border border-white/[0.08] bg-[#121826] text-[13px] font-medium text-[#94A3B8] hover:text-[#F1F5F9] hover:border-white/[0.14] transition-colors"
        >
          Today
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-[14px] border border-white/[0.06] bg-[#121826] overflow-hidden"
      >
        {view === "month" && (
          <div className="overflow-x-auto">
            <div className="min-w-[700px] p-4">
              <div className="grid grid-cols-7 mb-2 border-b border-white/[0.04] pb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-[11px] font-semibold text-[#475569] py-2 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-[1px] bg-white/[0.03]">
                {monthData.map((day, index) => {
                  const isToday = day &&
                    day.getDate() === new Date().getDate() &&
                    day.getMonth() === new Date().getMonth() &&
                    day.getFullYear() === new Date().getFullYear();

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[110px] p-2.5 transition-colors duration-150 bg-[#121826]",
                        day ? "hover:bg-[#0F1523] cursor-default" : "",
                        isToday && "bg-[#0F1523] ring-1 ring-inset ring-[#3B82F6]/30"
                      )}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            "text-[13px] font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                            isToday
                              ? "bg-[#3B82F6] text-white text-[12px] font-semibold"
                              : "text-[#64748B]"
                          )}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1.5 max-h-[85px] overflow-y-auto no-scrollbar">
                            {getEventsForDate(day).map((event) => (
                              <div
                                key={event.id}
                                className={cn(
                                  "truncate rounded-[6px] px-2 py-[3px] text-[11px] cursor-pointer font-medium transition-colors",
                                  event.type === 'meeting'
                                    ? "bg-[#8B5CF6]/[0.15] text-[#C4B5FD] border border-[#8B5CF6]/25 hover:bg-[#8B5CF6]/[0.25]"
                                    : "bg-[#3B82F6]/[0.15] text-[#93C5FD] border border-[#3B82F6]/25 hover:bg-[#3B82F6]/[0.25]"
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
          <div className="p-5 rounded-[14px] bg-[#121826] border border-white/[0.06]">
            <h3 className="mb-4 text-[17px] font-semibold text-[#F1F5F9] flex items-center gap-2">
              {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>

            <div className="space-y-4">
              {getEventsForDate(date).length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center rounded-[12px] border border-dashed border-white/[0.08] bg-[#0F1523] p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mb-3">
                    <CalendarIcon className="h-5 w-5 text-[#93C5FD]" />
                  </div>
                  <p className="text-[14px] font-medium text-[#64748B]">No events scheduled</p>
                  <p className="text-[12px] text-[#475569] mt-1">Create a new event to get started</p>
                  <button
                    type="button"
                    onClick={() => setCreateDialogOpen(true)}
                    className="mt-3 text-[13px] text-[#93C5FD] hover:text-[#3B82F6] transition-colors"
                  >
                    + Schedule something
                  </button>
                </div>
              ) : (
                getEventsForDate(date).map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ x: 3 }}
                    className="group relative overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#0F1523] p-4 transition-all cursor-pointer hover:border-white/[0.10]"
                    onClick={() => handleEventClick(event)}
                  >
                    {/* Left accent bar */}
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[12px]",
                      event.type === 'meeting' ? "bg-[#8B5CF6]" : "bg-[#3B82F6]"
                    )} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            event.type === 'meeting'
                              ? "bg-[#8B5CF6]/[0.15] text-[#C4B5FD]"
                              : "bg-[#3B82F6]/[0.15] text-[#93C5FD]"
                          )}>
                            {event.type === 'meeting' ? 'Meeting' : 'Event'}
                          </span>
                          <span className="text-[12px] text-[#64748B] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(event.startTime)} – {formatTime(event.endTime)}
                          </span>
                        </div>
                        <h4 className="text-[15px] font-semibold text-[#F1F5F9] group-hover:text-[#93C5FD] transition-colors">
                          {event.title}
                        </h4>
                        <p className="text-[13px] text-[#64748B] mt-0.5 line-clamp-1">{event.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[12px]">
                        {event.location && (
                          <div className="flex items-center gap-1 bg-white/[0.06] px-2.5 py-1 rounded-full text-[#94A3B8]">
                            <MapPin className="h-3 w-3 text-[#64748B]" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-white/[0.06] px-2.5 py-1 rounded-full text-[#94A3B8]">
                          <Users className="h-3 w-3 text-[#64748B]" />
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

              <div className="p-5 space-y-4 bg-[#121826]">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-[#0F1523] border border-white/[0.06] rounded-[8px]">
                    <Clock className="w-4 h-4 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#F1F5F9]">Date & Time</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      {selectedEvent.startTime.toLocaleDateString()}
                    </p>
                    <p className="text-[12px] text-[#64748B]">
                      {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-[#0F1523] border border-white/[0.06] rounded-[8px]">
                    <MapPin className="w-4 h-4 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#F1F5F9]">Location</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">{selectedEvent.location || "No location specified"}</p>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="bg-[#0F1523] border border-white/[0.04] p-3 rounded-[10px] text-[13px] text-[#94A3B8]">
                    {selectedEvent.description}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06]">
                  <div>
                    <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">ORGANIZER</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {selectedEvent.organizer.charAt(0)}
                      </div>
                      <span className="text-[13px] font-medium text-[#F1F5F9]">{selectedEvent.organizer}</span>
                    </div>
                  </div>

                  {selectedEvent.attendees.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">ATTENDEES ({selectedEvent.attendees.length})</p>
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
