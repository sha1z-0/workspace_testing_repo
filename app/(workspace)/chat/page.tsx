"use client"

import type React from "react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { usersAPI, chatAPI } from "@/lib/api"
import { useEffect, useState, useRef } from "react"
import { Loader2, Send, Plus, Search, MessageSquare, UserPlus, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Date utility functions
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

const formatDate = (date: Date): string => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) {
    return "Today"
  } else if (isSameDay(date, yesterday)) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  }
}

export default function ChatPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("direct")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        try {
          const allUsers = await usersAPI.getAll()
          // Filter out current user
          const filteredUsers = allUsers.filter((u) => u.uid !== user.id)
          setUsers(filteredUsers)

          // After users are loaded, check localStorage for last selected chat
          const lastChat = localStorage.getItem('finova-last-chat');
          if (lastChat) {
            try {
              const parsedChat = JSON.parse(lastChat);
              if (parsedChat.type === 'direct') {
                const foundUser = filteredUsers.find(u => u.uid === parsedChat.id);
                if (foundUser) {
                  setSelectedUser(foundUser);
                }
              }
            } catch (e) {
              console.error("Error parsing last chat:", e);
            }
          }
        } catch (error) {
          console.error("Error fetching users:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Fetch user's chat groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (user) {
        try {
          const userGroups = await chatAPI.getUserChatGroups(user.id);
          setGroups(userGroups);

          // After groups are loaded, check localStorage for last selected group
          const lastChat = localStorage.getItem('finova-last-chat');
          if (lastChat) {
            try {
              const parsedChat = JSON.parse(lastChat);
              if (parsedChat.type === 'group') {
                const foundGroup = userGroups.find(g => g.id === parsedChat.id);
                if (foundGroup) {
                  setSelectedGroup(foundGroup);
                }
              }
            } catch (e) {
              console.error("Error parsing last chat:", e);
            }
          }
        } catch (error) {
          console.error("Error fetching chat groups:", error);
        }
      }
    };

    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Save selected chat to localStorage
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem('finova-last-chat', JSON.stringify({
        type: 'direct',
        id: selectedUser.uid
      }));
    } else if (selectedGroup) {
      localStorage.setItem('finova-last-chat', JSON.stringify({
        type: 'group',
        id: selectedGroup.id
      }));
    }
  }, [selectedUser, selectedGroup]);

  // Fetch messages when a user is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (user && selectedUser) {
        setLoadingMessages(true);
        try {
          console.log("Fetching direct messages between", user.id, "and", selectedUser.uid);
          const messageHistory = await chatAPI.getDirectMessageHistory(user.id, selectedUser.uid);
          console.log("Fetched direct messages:", messageHistory.length, messageHistory);

          if (messageHistory.length === 0) {
            console.log("No messages found. Check Firestore collection.");
          }

          setMessages(messageHistory);

          // Mark unread messages as read
          const unreadMessages = messageHistory
            .filter((msg: any) => msg.isRead === false && msg.senderId === selectedUser.uid)
            .map((msg: any) => msg.id);

          if (unreadMessages.length > 0) {
            await chatAPI.markMessagesAsRead(unreadMessages);
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
        } finally {
          setLoadingMessages(false);
        }
      }
    };

    if (selectedUser) {
      fetchMessages();

      // Set up polling for new messages every 10 seconds
      const intervalId = setInterval(fetchMessages, 10000);

      // Clear selected group
      setSelectedGroup(null);
      setActiveTab("direct");

      return () => clearInterval(intervalId);
    }
  }, [user, selectedUser]);

  // Fetch group messages when a group is selected
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (user && selectedGroup) {
        setLoadingMessages(true);
        try {
          const messageHistory = await chatAPI.getGroupMessageHistory(selectedGroup.id);
          console.log("Fetched group messages:", messageHistory);
          setMessages(messageHistory);
        } catch (error) {
          console.error("Error fetching group messages:", error);
        } finally {
          setLoadingMessages(false);
        }
      }
    };

    if (selectedGroup) {
      fetchGroupMessages();

      // Set up polling for new messages every 10 seconds
      const intervalId = setInterval(fetchGroupMessages, 10000);

      // Clear selected user
      setSelectedUser(null);
      setActiveTab("groups");

      return () => clearInterval(intervalId);
    }
  }, [user, selectedGroup]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";

    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()),
  )

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !user) return

    const messageText = message.trim();
    console.log("Sending message:", messageText);

    // Clear the input immediately for better UX
    setMessage("");

    try {
      if (selectedUser) {
        console.log(`Sending direct message to ${selectedUser.name} (${selectedUser.uid})`);
        // Send direct message
        const sentMessageResult = await chatAPI.sendDirectMessage(
          user.id,
          selectedUser.uid,
          messageText,
          user.name
        );

        console.log("Message sent successfully:", sentMessageResult);

        // No need to update local state - the polling will fetch the new message
        // Just trigger an immediate fetch to update faster
        const messageHistory = await chatAPI.getDirectMessageHistory(user.id, selectedUser.uid);
        setMessages(messageHistory);
      } else if (selectedGroup) {
        console.log(`Sending group message to ${selectedGroup.name} (${selectedGroup.id})`);
        // Send group message
        const sentMessageResult = await chatAPI.sendGroupMessage(
          user.id,
          selectedGroup.id,
          messageText,
          user.name
        );

        console.log("Group message sent successfully:", sentMessageResult);

        // No need to update local state - the polling will fetch the new message
        // Just trigger an immediate fetch to update faster
        const messageHistory = await chatAPI.getGroupMessageHistory(selectedGroup.id);
        setMessages(messageHistory);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || groupMembers.length === 0) return;

    try {
      setIsCreatingGroup(true);

      // Add current user to group
      const allMembers = [user.id, ...groupMembers];

      // Create the group using the chatAPI
      const newGroup = await chatAPI.createChatGroup({
        name: groupName,
        description: groupDescription,
        members: allMembers,
        createdBy: user.id
      });

      toast({
        title: "Group created",
        description: "Your new chat group has been created."
      });

      // Update local groups state
      setGroups(prev => [...prev, newGroup]);

      // Reset form
      setGroupName("");
      setGroupDescription("");
      setGroupMembers([]);
      setIsGroupDialogOpen(false);

      // Select the newly created group
      setSelectedGroup(newGroup);

    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingGroup(false);
    }
  }

  // Handle clearing the selected chat (for mobile back button)
  const handleClearSelection = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setMessages([]);
  };

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
      className="flex h-[calc(100vh-8rem)] flex-col space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-blue-600 p-8 text-white shadow-xl ring-1 ring-white/10 dark:from-blue-900 dark:to-slate-900"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">Chat</h1>
            <p className="text-indigo-100 max-w-xl text-lg">
              Communicate with your team members in real-time.
            </p>
          </div>

          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg bg-white text-indigo-600 hover:bg-indigo-50 border-none">
                <Users className="mr-2 h-5 w-5" />
                New Group
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new chat group with your team members
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Enter group description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="members">Add Members</Label>
                  <Select
                    onValueChange={(value) => {
                      if (!groupMembers.includes(value)) {
                        setGroupMembers([...groupMembers, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select members" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map((u) => (
                        <SelectItem key={u.uid} value={u.uid}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {groupMembers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm mb-2">Selected members:</p>
                      <div className="flex flex-wrap gap-2">
                        {groupMembers.map((memberId) => {
                          const member = users.find((u) => u.uid === memberId);
                          return (
                            <div
                              key={memberId}
                              className="flex items-center gap-2 bg-muted rounded-md px-2 py-1"
                            >
                              <span>{member?.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => setGroupMembers(groupMembers.filter((id) => id !== memberId))}
                              >
                                ×
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName || groupMembers.length === 0 || isCreatingGroup}
                >
                  {isCreatingGroup ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Group"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <div className="flex flex-1 overflow-hidden rounded-3xl border border-white/20 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10">
        {/* Sidebar - hide on smaller screens */}
        <div className="w-80 border-r border-white/10 max-h-full overflow-hidden flex-shrink-0 hidden md:block bg-white/20 dark:bg-slate-900/20">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="direct" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">Direct</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>
            <TabsContent value="direct" className="mt-0">
              <div className="flex items-center justify-between p-2">
                <p className="text-sm font-medium">Contacts</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  toast({
                    title: "Feature coming soon",
                    description: "Adding contacts will be available in the next update."
                  })
                }}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="p-2">
                  {filteredUsers.length === 0 ? (
                    <div className="flex h-20 items-center justify-center text-center text-sm text-muted-foreground">
                      No contacts found
                    </div>
                  ) : (
                    filteredUsers.map((contact) => (
                      <div
                        key={contact.uid}
                        className={`flex cursor-pointer items-center space-x-4 rounded-xl p-3 mb-1 transition-all duration-200 border border-transparent ${selectedUser?.uid === contact.uid
                          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm"
                          : "hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-md hover:scale-[1.02]"
                          }`}
                        onClick={() => setSelectedUser(contact)}
                      >
                        <Avatar>
                          <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {contact.department || "General"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="groups" className="mt-0">
              {groups.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
                  No groups yet. Create a new group to get started.
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="p-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className={`flex cursor-pointer items-center space-x-4 rounded-xl p-3 mb-1 transition-all duration-200 border border-transparent ${selectedGroup?.id === group.id
                          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm"
                          : "hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-md hover:scale-[1.02]"
                          }`}
                        onClick={() => setSelectedGroup(group)}
                      >
                        <Avatar>
                          <AvatarImage src={group.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 truncate">
                          <div className="font-medium">{group.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {group.members?.length || 0} members
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile sidebar toggle */}
        <div className="md:hidden flex items-center p-2 border-r">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Users className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 w-[90%] h-[80vh] max-w-md block">
              <div className="w-full h-full overflow-hidden">
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Tabs defaultValue="direct" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="direct">Direct</TabsTrigger>
                    <TabsTrigger value="groups">Groups</TabsTrigger>
                  </TabsList>
                  <TabsContent value="direct" className="mt-0">
                    <div className="flex items-center justify-between p-2">
                      <p className="text-sm font-medium">Contacts</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        toast({
                          title: "Feature coming soon",
                          description: "Adding contacts will be available in the next update."
                        })
                      }}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[calc(100vh-16rem)]">
                      <div className="p-2">
                        {filteredUsers.length === 0 ? (
                          <div className="flex h-20 items-center justify-center text-center text-sm text-muted-foreground">
                            No contacts found
                          </div>
                        ) : (
                          filteredUsers.map((contact) => (
                            <div
                              key={contact.uid}
                              className={`flex cursor-pointer items-center space-x-4 rounded-lg p-3 transition-colors hover:bg-muted ${selectedUser?.uid === contact.uid ? "bg-muted" : ""
                                }`}
                              onClick={() => setSelectedUser(contact)}
                            >
                              <Avatar>
                                <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                                <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 truncate">
                                <div className="font-medium">{contact.name}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {contact.department || "General"}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="groups" className="mt-0">
                    {groups.length === 0 ? (
                      <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
                        No groups yet. Create a new group to get started.
                      </div>
                    ) : (
                      <ScrollArea className="h-[calc(100vh-16rem)]">
                        <div className="p-2">
                          {groups.map((group) => (
                            <div
                              key={group.id}
                              className={`flex cursor-pointer items-center space-x-4 rounded-lg p-3 transition-colors hover:bg-muted ${selectedGroup?.id === group.id ? "bg-muted" : ""
                                }`}
                              onClick={() => setSelectedGroup(group)}
                            >
                              <Avatar>
                                <AvatarImage src={group.avatar || "/placeholder.svg"} />
                                <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 truncate">
                                <div className="font-medium">{group.name}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {group.members?.length || 0} members
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {(selectedUser || selectedGroup) ? (
            <>
              <div className="flex items-center justify-between space-x-4 border-b p-3 bg-muted/30">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-9 w-9">
                    {selectedUser ? (
                      <>
                        <AvatarImage src={selectedUser.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src={selectedGroup.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{getInitials(selectedGroup.name)}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedUser ? selectedUser.name : selectedGroup.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedUser ?
                        (selectedUser.department || "General") :
                        `${selectedGroup.members?.length || 0} members`
                      }
                    </div>
                  </div>
                </div>
                {/* Mobile back button */}
                <Button variant="ghost" size="icon" className="md:hidden" onClick={handleClearSelection}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6" /></svg>
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col space-y-4">
                  {loadingMessages ? (
                    <div className="flex flex-col justify-center items-center py-10 space-y-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-10 space-y-2">
                      <MessageSquare className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No messages yet. Send a message to start the conversation.</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout" initial={false}>
                      {messages.map((msg, index) => {
                        // For debugging only - moved outside JSX
                        if (index === 0) console.log("Rendering messages:", messages);

                        // Ensure senderId exists and is a string
                        const senderId = msg.senderId?.toString() || '';
                        const userId = user?.id?.toString() || '';
                        const isCurrentUser = senderId === userId;

                        // Convert Firestore timestamp to Date object or use as is if already a Date
                        let messageTime;
                        try {
                          messageTime = msg.createdAt?.toDate ? msg.createdAt.toDate() :
                            (msg.createdAt instanceof Date ? msg.createdAt : new Date());
                        } catch (error) {
                          console.error("Error parsing date:", error, msg.createdAt);
                          messageTime = new Date();
                        }

                        // Check if we should show the date label
                        const showDateLabel = index === 0 ||
                          (index > 0 && !isSameDay(messageTime, messages[index - 1].createdAt?.toDate?.() || new Date()));

                        // Check for consecutive messages from same sender
                        const showSender = selectedGroup && !isCurrentUser && (
                          index === 0 ||
                          messages[index - 1].senderId !== senderId
                        );

                        // Check time gap between messages
                        const shouldGroupWithPrevious = index > 0 &&
                          messages[index - 1].senderId === senderId &&
                          messageTime.getTime() - (messages[index - 1].createdAt?.toDate?.().getTime() || 0) < 5 * 60 * 1000; // 5 minutes

                        return (
                          <motion.div
                            key={msg.id || index}
                            layout
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="origin-bottom-left"
                          >
                            {showDateLabel && (
                              <div className="flex justify-center my-6">
                                <span className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground backdrop-blur-sm">
                                  {formatDate(messageTime)}
                                </span>
                              </div>
                            )}
                            <div
                              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} 
                                ${!showDateLabel && !shouldGroupWithPrevious ? "mt-4" : "mt-1"}`}
                            >
                              {!isCurrentUser && selectedGroup && showSender && (
                                <Avatar className="h-8 w-8 mr-3 mt-1 shadow-sm ring-1 ring-white/20">
                                  <AvatarFallback className="text-xs bg-gradient-to-br from-pink-500 to-rose-500 text-white border-none">{getInitials(msg.senderName || "?")}</AvatarFallback>
                                </Avatar>
                              )}
                              {!isCurrentUser && selectedGroup && !showSender && (
                                <div className="w-11" /> /* Spacer for alignment */
                              )}
                              <div className={`flex flex-col max-w-[75%] ${isCurrentUser ? "items-end" : "items-start"}`}>
                                {showSender && (
                                  <div className="text-xs text-muted-foreground mb-1 ml-1 font-medium">
                                    {msg.senderName || "Unknown user"}
                                  </div>
                                )}
                                <div
                                  className={`rounded-2xl px-5 py-3 text-sm shadow-sm transition-all hover:shadow-md ${isCurrentUser
                                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none shadow-blue-500/20"
                                    : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-none"
                                    } ${shouldGroupWithPrevious ? "mt-0.5" : ""}`}
                                >
                                  {msg.text || ''}
                                </div>
                                <div className={`text-[10px] mt-1 text-muted-foreground/70 mx-1 ${isCurrentUser ? "text-right" : "text-left"}`}>
                                  {messageTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </ScrollArea>

              <form onSubmit={handleSendMessage} className="flex items-center space-x-2 border-t border-white/10 p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 bg-white/50 dark:bg-slate-800/50 border-white/10 focus-visible:ring-blue-500 rounded-full pl-4 shadow-inner"
                  onKeyDown={(e) => {
                    // Send message on Enter without shift key
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (message.trim().length > 0) {
                        handleSendMessage(e);
                      }
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={message.trim().length === 0}
                  className="shrink-0 h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <div className="max-w-sm space-y-4">
                <div className="rounded-full bg-muted p-6 mx-auto w-fit">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium">Start a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Select a contact or group from the sidebar to start chatting. Your conversations will appear here.
                </p>

                {/* Mobile-only contact selection */}
                <div className="md:hidden mt-6">
                  <h4 className="font-medium text-sm mb-3">Recent contacts</h4>
                  <div className="space-y-2">
                    {filteredUsers.slice(0, 3).map((contact) => (
                      <Button
                        key={contact.uid}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setSelectedUser(contact)}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        <span>{contact.name}</span>
                      </Button>
                    ))}

                    {groups.slice(0, 2).map((group) => (
                      <Button
                        key={group.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setSelectedGroup(group)}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={group.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
                        </Avatar>
                        <span>{group.name}</span>
                      </Button>
                    ))}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full mt-2">
                          <Users className="mr-2 h-4 w-4" />
                          View all contacts
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="p-0 w-[90%] h-[80vh] max-w-md block">
                        <div className="w-full h-full overflow-hidden">
                          <Tabs defaultValue="direct" value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="direct">Direct</TabsTrigger>
                              <TabsTrigger value="groups">Groups</TabsTrigger>
                            </TabsList>
                            {/* Copy of the regular tabs content */}
                          </Tabs>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
