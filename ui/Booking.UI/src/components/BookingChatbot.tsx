import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { createReservation, getReservations, getRooms, getUsers } from "../lib/api";
import type { Reservation, Room, UserSummary } from "../lib/types";
import { combineDateAndTime, toDateInputValue } from "../lib/dates";
import { getCurrentUserId } from "../lib/auth";

interface RecommendedRoom {
  id: string;
  name: string;
  location: string;
  capacity: number;
  timeSlotText: string;
  startIso: string;
  endIso: string;
  tag?: string;
}

interface PendingBookingState {
  room: RecommendedRoom;
  selectedAttendeeIds: string[];
}

interface ConfirmedBookingInfo {
  bookingRef: string;
  roomName: string;
  timeText: string;
  attendeeNames?: string[];
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text?: string;
  timestamp: string;
  recommendations?: RecommendedRoom[];
  pendingBooking?: PendingBookingState;
  confirmedBooking?: ConfirmedBookingInfo;
}

const QUICK_PROMPTS = [
  "Book a room for 6 people tomorrow at 2 PM",
  "Need 15+ seats on Friday afternoon",
  "Quick 30 min sync today for 3 people",
];

export function BookingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserSummary[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = getCurrentUserId();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "bot",
      text: "Hello! I'm your AI Booking Concierge. Tell me what kind of meeting you're planning — group size, preferred time, or colleagues to invite — and I'll find and reserve the best available room for you.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Load available rooms and colleagues on mount
  useEffect(() => {
    getRooms()
      .then((data) => setRooms(data.filter((r) => r.isActive)))
      .catch((err) => console.warn("[Chatbot] Could not load rooms:", err));

    getUsers()
      .then((users) => {
        // Exclude current user as host
        setAvailableUsers(users.filter((u) => u.id !== currentUserId));
      })
      .catch((err) => console.warn("[Chatbot] Could not load colleagues:", err));
  }, [currentUserId]);

  // Listen for external toggle events (e.g. from sidebar navigation)
  useEffect(() => {
    function handleToggle() {
      setIsOpen((prev) => !prev);
    }
    window.addEventListener("toggle-ai-chat", handleToggle);
    return () => window.removeEventListener("toggle-ai-chat", handleToggle);
  }, []);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  function handleReset() {
    setMessages([
      {
        id: crypto.randomUUID(),
        sender: "bot",
        text: "Conversation reset! How can I help you find a conference room today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  function handleQuickPrompt(promptText: string) {
    setInput(promptText);
    processUserInput(promptText);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    processUserInput(query);
  }

  async function processUserInput(userText: string) {
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: userText,
      timestamp: timeNow,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI parsing and DB checking
    setTimeout(async () => {
      try {
        const lower = userText.toLowerCase();

        // Extract capacity
        const capacityMatch = lower.match(/(\d+)\s*(people|persons|seats|attendees)?/);
        const minCapacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 4;

        // Extract date
        const targetDate = new Date();
        if (lower.includes("tomorrow")) {
          targetDate.setDate(targetDate.getDate() + 1);
        } else if (lower.includes("friday")) {
          const day = targetDate.getDay();
          const diff = (5 - day + 7) % 7 || 7;
          targetDate.setDate(targetDate.getDate() + diff);
        }

        const dateStr = toDateInputValue(targetDate);
        let startHour = "14:00";
        let endHour = "15:00";

        if (lower.includes("10 am") || lower.includes("10am")) {
          startHour = "10:00";
          endHour = "11:00";
        } else if (lower.includes("30 min sync") || lower.includes("sync today")) {
          startHour = "15:00";
          endHour = "15:30";
        } else if (lower.includes("morning")) {
          startHour = "09:00";
          endHour = "10:00";
        }

        const startIso = combineDateAndTime(dateStr, startHour).toISOString();
        const endIso = combineDateAndTime(dateStr, endHour).toISOString();

        // Fetch current reservations to filter out conflicts
        let reservations: Reservation[] = [];
        try {
          reservations = await getReservations();
        } catch {
          // Fallback to room capacity filtering if reservations fail
        }

        // Filter rooms matching capacity and not conflicting
        const conflictingRoomIds = new Set(
          reservations
            .filter((res) => {
              const resStart = new Date(res.startTime).getTime();
              const resEnd = new Date(res.endTime).getTime();
              const reqStart = new Date(startIso).getTime();
              const reqEnd = new Date(endIso).getTime();
              return reqStart < resEnd && reqEnd > resStart;
            })
            .map((res) => res.roomId)
        );

        const available = rooms
          .filter((r) => r.capacity >= minCapacity && !conflictingRoomIds.has(r.id))
          .sort((a, b) => a.capacity - b.capacity);

        // Check if any colleagues are mentioned in text
        const mentionedAttendeeIds: string[] = [];
        for (const user of availableUsers) {
          if (lower.includes(user.username.toLowerCase())) {
            mentionedAttendeeIds.push(user.id);
          }
        }

        const timeLabel = `${targetDate.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} · ${startHour} – ${endHour}`;

        if (available.length > 0) {
          const recommendations: RecommendedRoom[] = available.slice(0, 3).map((r, idx) => ({
            id: r.id,
            name: r.name,
            location: r.location,
            capacity: r.capacity,
            timeSlotText: timeLabel,
            startIso,
            endIso,
            tag: idx === 0 ? "Best Match" : "Available",
          }));

          const attendeeHint =
            mentionedAttendeeIds.length > 0
              ? ` (I found ${mentionedAttendeeIds.length} colleague${mentionedAttendeeIds.length === 1 ? "" : "s"} mentioned)`
              : "";

          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: "bot",
              text: `I checked room availability for **${timeLabel}** for **${minCapacity}+ attendees**${attendeeHint}. Choose an option below to invite attendees or book directly:`,
              recommendations,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        } else {
          // If no rooms matched exact criteria, suggest alternative
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: "bot",
              text: `I couldn't find any vacant rooms with capacity for ${minCapacity} at that exact time slot. Would you like me to look for a different time today or tomorrow?`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "bot",
            text: "I ran into a temporary issue checking room calendars. Please try again or specify another time.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    }, 700);
  }

  function handleSelectRoomForAttendees(rec: RecommendedRoom) {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: "bot",
        text: `You selected **${rec.name}** (capacity: ${rec.capacity} people) for **${rec.timeSlotText}**.\n\nWho will be joining you? Select colleagues below to invite them as attendees:`,
        pendingBooking: {
          room: rec,
          selectedAttendeeIds: [],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  function toggleAttendeeInPending(messageId: string, userId: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.pendingBooking) return m;
        const current = m.pendingBooking.selectedAttendeeIds;
        const isSelected = current.includes(userId);
        const maxAttendees = Math.max(0, m.pendingBooking.room.capacity - 1);
        if (!isSelected && current.length >= maxAttendees) {
          return m;
        }
        const next = isSelected ? current.filter((id) => id !== userId) : [...current, userId];
        return {
          ...m,
          pendingBooking: {
            ...m.pendingBooking,
            selectedAttendeeIds: next,
          },
        };
      })
    );
  }

  async function handleConfirmBooking(rec: RecommendedRoom, attendeeIds: string[]) {
    setIsTyping(true);
    try {
      // Execute booking via API
      const res = await createReservation({
        roomId: rec.id,
        startTime: rec.startIso,
        endTime: rec.endIso,
        attendeeUserIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      });

      const bookingRef = `BK-${res.id.slice(0, 8).toUpperCase()}`;
      const attendeeNames = availableUsers
        .filter((u) => attendeeIds.includes(u.id))
        .map((u) => u.username);

      // Dispatch event to refresh calendar if open on HomePage
      window.dispatchEvent(new CustomEvent("refresh-reservations"));

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "bot",
          confirmedBooking: {
            bookingRef,
            roomName: rec.name,
            timeText: rec.timeSlotText,
            attendeeNames,
          },
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "bot",
          text: `Could not complete the booking for ${rec.name}. It may have just been reserved by someone else or exceeds business hours.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-4 py-3 text-white shadow-xl shadow-indigo-500/25 transition-all duration-200 hover:scale-105 hover:shadow-indigo-500/40 active:scale-95 focus:outline-none"
          title="Open AI Booking Concierge"
          aria-label="Open AI Booking Concierge"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="size-5 animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide">AI Assistant</span>
          <span className="flex size-2 rounded-full bg-emerald-400 ring-2 ring-indigo-900" />
        </button>
      )}

      {/* Slide-over Chat Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl text-card-foreground shadow-2xl transition-all duration-300 ${
            isExpanded
              ? "inset-4 sm:inset-10 md:inset-16 max-w-4xl mx-auto h-[calc(100vh-5rem)]"
              : "bottom-4 right-4 w-[calc(100vw-2rem)] sm:w-[410px] h-[610px] max-h-[85vh]"
          }`}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
                  <Bot className="size-4.5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">AI Concierge</span>
                  <span className="rounded-full bg-indigo-500/15 border border-indigo-500/20 px-1.5 py-0.2 text-[9px] font-bold text-indigo-500 dark:text-indigo-400">
                    Smart Booking
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Natural language room recommendations</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Reset Chat"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                title={isExpanded ? "Collapse" : "Expand"}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 bg-muted/20 px-3 py-2 text-[11px] no-scrollbar">
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">Try:</span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                className="shrink-0 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 transition-colors hover:bg-indigo-500/20"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs mt-0.5">
                    <Bot className="size-3.5" />
                  </div>
                )}

                <div className={`max-w-[88%] space-y-2.5`}>
                  {msg.text && (
                    <div
                      className={`rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                        msg.sender === "user"
                          ? "rounded-tr-xs bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                          : "rounded-tl-xs border border-border bg-muted/40 text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  )}

                  {/* Recommendations Cards */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {msg.recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="group rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:border-indigo-500/40 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="truncate text-xs font-bold text-foreground">{rec.name}</h4>
                                {rec.tag && (
                                  <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {rec.tag}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building2 className="size-3 text-primary" />
                                  {rec.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="size-3 text-primary" />
                                  {rec.capacity} seats
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                <Clock className="size-3" />
                                <span>{rec.timeSlotText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-border/50">
                            <button
                              type="button"
                              onClick={() => handleSelectRoomForAttendees(rec)}
                              className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-500 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Users className="size-3.5" />
                              <span>Invite Attendees & Book</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmBooking(rec, [])}
                              title="Book directly without attendees"
                              className="rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer"
                            >
                              Quick Solo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending Booking & Attendee Selection Card */}
                  {msg.pendingBooking && (
                    <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-card p-3.5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Select Attendees</span>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {1 + msg.pendingBooking.selectedAttendeeIds.length}
                          </span>{" "}
                          / {msg.pendingBooking.room.capacity} seats filled
                        </span>
                      </div>

                      {availableUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {availableUsers.map((user) => {
                            const isSelected = msg.pendingBooking?.selectedAttendeeIds.includes(user.id);
                            const maxAttendees = Math.max(0, (msg.pendingBooking?.room.capacity ?? 1) - 1);
                            const isFull =
                              !isSelected &&
                              (msg.pendingBooking?.selectedAttendeeIds.length ?? 0) >= maxAttendees;

                            return (
                              <button
                                key={user.id}
                                type="button"
                                disabled={isFull}
                                onClick={() => toggleAttendeeInPending(msg.id, user.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                                    : isFull
                                    ? "border border-dashed border-border bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
                                    : "border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                }`}
                              >
                                {isSelected ? <Check className="size-3" /> : <UserPlus className="size-3" />}
                                <span>{user.username}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">No other colleagues found.</p>
                      )}

                      {1 + msg.pendingBooking.selectedAttendeeIds.length >= msg.pendingBooking.room.capacity && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          Maximum room capacity reached ({msg.pendingBooking.room.capacity} seats).
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmBooking(
                              msg.pendingBooking!.room,
                              msg.pendingBooking!.selectedAttendeeIds
                            )
                          }
                          className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-500 active:scale-98 cursor-pointer"
                        >
                          Confirm Reservation (
                          {1 + msg.pendingBooking.selectedAttendeeIds.length}{" "}
                          {1 + msg.pendingBooking.selectedAttendeeIds.length === 1 ? "person" : "people"})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmBooking(msg.pendingBooking!.room, [])}
                          className="rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                          Book Solo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirmed Booking Receipt Card */}
                  {msg.confirmedBooking && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-left">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>Booking Confirmed!</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 mb-2">
                        Your reservation is confirmed and invitations sent to attendees.
                      </p>
                      <div className="space-y-1 rounded-lg border border-emerald-500/20 bg-card/80 p-2.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Room:</span>
                          <span className="font-semibold text-foreground">{msg.confirmedBooking.roomName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Slot:</span>
                          <span className="font-semibold text-foreground">{msg.confirmedBooking.timeText}</span>
                        </div>
                        {msg.confirmedBooking.attendeeNames && msg.confirmedBooking.attendeeNames.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Attending:</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {msg.confirmedBooking.attendeeNames.join(", ")}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reference:</span>
                          <span className="font-mono font-bold text-indigo-500">{msg.confirmedBooking.bookingRef}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] text-muted-foreground px-1">{msg.timestamp}</div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-[10px] font-bold text-indigo-500">
                  AI
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                  <span className="size-1.5 animate-bounce rounded-full bg-indigo-500" />
                  <span className="size-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.3s]" />
                  <span className="ml-1 text-[11px]">Checking room availability...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-border bg-card p-3">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask e.g. Find a room for 8 people tomorrow at 2 PM..."
                className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs transition-all hover:opacity-90 disabled:opacity-40"
                title="Send Message"
              >
                <Send className="size-3.5" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>OpenAI Ready · Natural Language Search</span>
              <span>Instant Conflict Checks</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
