import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../Context/AuthContext";
import { useNavigate } from "react-router-dom";
// import { FaRegMessage } from "react-icons/fa6";
import { FaSignalMessenger } from "react-icons/fa6";
import { RiLoader2Fill } from "react-icons/ri";
import { IoMdSearch } from "react-icons/io";
import { MdEmojiEmotions } from "react-icons/md";
import { AiFillInfoCircle } from "react-icons/ai";

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  // It is used to store every latest message of contact
  const [previewByContactId, setPreviewByContactId] = useState({});
  // It is used to tell which conversation is belongs to which conversation
  const [conversationContactMap, setConversationContactMap] = useState({});

  // This state is create to manage the unread message status in chat
  const [unreadByContactId, setUnreadByContactId] = useState({});

  // These state are used for reactions
  const [reactionsByMessageId, setReactionsByMessageId] = useState({});
  const [reactionLoadingId, setReactionLoadingId] = useState(null);

  const [openEmojiMessageId, setOpenEmojiMessageId] = useState(null);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [messageActionLoading, setMessageActionLoading] = useState(false);

  // These state are used for message info or check is user read the messages

  const [infoMessage, setInfoMessage] = useState(null);
  const [infoReadStatus, setInfoReadStatus] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // this state is make for sender receipt status
  const [receiptByMessageId, setReceiptByMessageId] = useState({});

  const processedMessageIds = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadProfilesAndPreviews = async () => {
      setLoading(true);
      setError("");

      try {
        const { data: contacts, error: contactsError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .neq("id", user.id)
          .order("full_name");

        if (contactsError) throw contactsError;

        const { data: conversations, error: conversationsError } =
          await supabase
            .from("conversations")
            .select("id, user1_id, user2_id")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        if (conversationsError) throw conversationsError;

        const contactMap = {};
        const conversationIds = (conversations ?? []).map((conversation) => {
          const contactId =
            conversation.user1_id === user.id
              ? conversation.user2_id
              : conversation.user1_id;

          contactMap[conversation.id] = contactId;

          return conversation.id;
        });

        let previews = {};
        let recentMessages = [];

        if (conversationIds.length > 0) {
          const { data, error: messagesError } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, content, created_at")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false });

          if (messagesError) throw messagesError;

          recentMessages = data ?? [];

          for (const message of data ?? []) {
            processedMessageIds.current.add(message.id);
          }

          for (const message of recentMessages) {
            const contactId = contactMap[message.conversation_id];

            // First message encountered is the newest one
            // because the query is ordered newest first.
            if (contactId && !previews[contactId]) {
              previews[contactId] = message;
            }
          }
        }

        const { data: readStatuses, error: readError } = await supabase
          .from("conversation_reads")
          .select("conversation_id, last_read_at")
          .eq("user_id", user.id);

        if (readError) throw readError;

        const readTimeByConversation = {};

        for (const status of readStatuses ?? []) {
          readTimeByConversation[status.conversation_id] = new Date(
            status.last_read_at,
          ).getTime();
        }

        const unreadCounts = {};

        for (const message of recentMessages ?? []) {
          // Apne bheje hue messages unread count mein include nahi honge.
          if (message.sender_id === user.id) continue;

          const contactId = contactMap[message.conversation_id];
          if (!contactId) continue;

          const lastReadAt = readTimeByConversation[message.conversation_id];

          const messageTime = new Date(message.created_at).getTime();

          // Read status nahi hai to incoming message unread hai.
          const isUnread = lastReadAt === undefined || messageTime > lastReadAt;

          if (isUnread) {
            unreadCounts[contactId] = (unreadCounts[contactId] || 0) + 1;
          }
        }

        if (!active) return;

        setProfile(contacts ?? []);
        setConversationContactMap(contactMap);
        setPreviewByContactId(previews);
        setUnreadByContactId(unreadCounts);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfilesAndPreviews();

    return () => {
      active = false;
    };
  }, [user]);

  const openConversation = async (contact) => {
    setError("");
    setMessage([]);
    setConversationId(null);
    setSelectedUser(contact);

    // const firstUserId = user.id < contact.id ? user.id : contact.id;

    // const secondUserId = user.id < contact.id ? contact.id : user.id;

    // const { data: existing, error: findError } = await supabase
    //   .from("conversations")
    //   .select("id")
    //   .eq("user1_id", firstUserId)
    //   .eq("user2_id", secondUserId)
    //   .maybeSingle();

    // if (findError) {
    //   setError(findError.message);
    //   return;
    // }

    // if (existing) {
    //   setConversationId(existing.id);

    //   setConversationContactMap((previous) => ({
    //     ...previous,
    //     [existing.id]: contact.id,
    //   }));

    //   await markConversationAsRead(existing.id, contact.id);
    //   return;
    // }

    const [user1Id, user2Id] = [user.id, contact.id].sort();

    const { data: existing, error: findError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user1_id", user1Id)
      .eq("user2_id", user2Id)
      .maybeSingle();

    if (findError) {
      setError(findError.message);
      return;
    }

    if (existing) {
      setConversationId(existing.id);

      setConversationContactMap((previous) => ({
        ...previous,
        [existing.id]: contact.id,
      }));

      await markConversationAsRead(existing.id, contact.id);
      return;
    }

    // Create new conversation
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
      })
      .select("id")
      .single();

    if (createError) {
      // Ho sakta hai doosre request ne isi waqt conversation create kar di ho.
      const { data: retry, error: retryError } = await supabase
        .from("conversations")
        .select("id")
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .maybeSingle();

      if (retryError) {
        setError(retryError.message);
        return;
      }

      if (!retry) {
        setError(createError.message);
        return;
      }

      setConversationId(retry.id);

      setConversationContactMap((previous) => ({
        ...previous,
        [retry.id]: contact.id,
      }));

      await markConversationAsRead(retry.id, contact.id);
      return;
    }

    setSelectedUser(contact);
    setConversationId(created.id);

    setConversationContactMap((previous) => ({
      ...previous,
      [created.id]: contact.id,
    }));

    await markConversationAsRead(created.id, contact.id);
  };

  // Load messages and subscribe to new messages
  // useEffect(() => {
  //   if (!conversationId) return;

  //   let active = true;

  //   const loadMessages = async () => {
  //     const { data, error } = await supabase
  //       .from("messages")
  //       .select(
  //         "id, conversation_id, sender_id, content, created_at, edited_at",
  //       )
  //       .eq("conversation_id", conversationId)
  //       .order("created_at", { ascending: true });

  //     if (!active) return;

  //     if (error) {
  //       setError(error.message);
  //       return;
  //     }
  //     const loadedMessages = data ?? [];

  //     setMessage(loadedMessages);
  //     await loadReactions(loadedMessages);
  //     await markMessagesAsDelivered(loadedMessages);
  //     await loadMessageReceipts(loadedMessages);
  //     await markMessageAsRead(loadedMessages);
  //   };

  //   loadMessages();

  //   const channel = supabase
  //     .channel(`conversation-${conversationId}`)
  //     .on(
  //       "postgres_changes",
  //       {
  //         // event: "INSERT",
  //         event: "*",
  //         schema: "public",
  //         table: "messages",
  //         filter: `conversation_id=eq.${conversationId}`,
  //       },
  //       async (payload) => {
  //         const eventType = payload.eventType;

  //         if (eventType === "INSERT") {
  //           const newMessage = payload.new;

  //           // Incoming message ko delivered mark karein.
  //           // if (newMessage.sender_id !== user.id) {
  //           //   await markMessagesAsDelivered([newMessage]);
  //           // }

  //           if (!active) return;

  //           setMessage((previous) => {
  //             const alreadyExists = previous.some(
  //               (item) => item.id === newMessage.id,
  //             );
  //             if (alreadyExists) return previous;

  //             return [...previous, newMessage].sort(
  //               (a, b) =>
  //                 new Date(a.created_at).getTime() -
  //                 new Date(b.created_at).getTime(),
  //             );
  //           });
  //           if (newMessage.sender_id !== user.id) {
  //             await markMessagesAsDelivered([newMessage]);
  //             await markMessageAsRead([newMessage]);
  //           }
  //         }

  //         if (eventType === "UPDATE") {
  //           const updateMessage = payload.new;

  //           setMessage((previous) =>
  //             previous.map((message) =>
  //               message.id === updateMessage.id
  //                 ? { ...message, ...updateMessage }
  //                 : message,
  //             ),
  //           );
  //         }
  //         if (eventType === "DELETE") {
  //           const deleteMessageId = payload.old?.id;
  //           if (!deleteMessageId) return;

  //           setMessage((previous) =>
  //             previous.filter((message) => message.id !== deleteMessageId),
  //           );
  //           // setReactionLoadingId((previous) => {
  //           //   const upload = { ...previous };
  //           //   delete update[deleteMessageId];
  //           //   return upload;
  //           // });

  //           setReactionsByMessageId((previous) => {
  //             const updated = { ...previous };
  //             delete updated[deleteMessageId];
  //             return updated;
  //           });
  //         }
  //       },
  //     )
  //     // .subscribe();
  //     .subscribe((status) => {
  //       console.log("Message Realtime status : ", status);
  //     });

  //   return () => {
  //     active = false;
  //     supabase.removeChannel(channel);
  //   };
  // }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    let active = true;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, conversation_id, sender_id, content, created_at, edited_at",
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        setError(error.message);
        return;
      }

      const loadedMessages = data ?? [];

      setMessage(loadedMessages);
      await loadReactions(loadedMessages);
      await markMessagesAsDelivered(loadedMessages);
      await loadMessageReceipts(loadedMessages);
      await markMessageAsRead(loadedMessages);
    };

    loadMessages();

    const channel = supabase
      .channel(`conversation-${conversationId}`)

      // INSERT and UPDATE listener
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const eventType = payload.eventType;

          if (!active) return;

          if (eventType === "INSERT") {
            const newMessage = payload.new;

            setMessage((previous) => {
              const alreadyExists = previous.some(
                (item) => item.id === newMessage.id,
              );

              if (alreadyExists) return previous;

              return [...previous, newMessage].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              );
            });

            if (newMessage.sender_id !== user?.id) {
              await markMessagesAsDelivered([newMessage]);
              await markMessageAsRead([newMessage]);
            }
          }

          if (eventType === "UPDATE") {
            const updateMessage = payload.new;

            setMessage((previous) =>
              previous.map((message) =>
                message.id === updateMessage.id
                  ? { ...message, ...updateMessage }
                  : message,
              ),
            );
          }
        },
      )

      // Separate DELETE listener
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("MESSAGE DELETE EVENT:", payload);

          if (!active) return;

          // const deletedMessage = payload.old?.id;

          // if (deletedMessage?.conversation_id !== conversationId) return;

          // const deletedMessageId = deletedMessage.id;

          const deletedMessageId = payload.old?.id;
          if (!deletedMessageId) return;

          const messageExists = messagesRef.current.some(
            (msg) => msg.id === deletedMessageId,
          );

          if (!messageExists) return;

          setMessage((previous) =>
            previous.filter((msg) => msg.id !== deletedMessageId),
          );

          setReactionsByMessageId((previous) => {
            const updated = { ...previous };
            delete updated[deletedMessageId];
            return updated;
          });
        },
      )

      .subscribe((status) => {
        console.log("Message Realtime status:", status);
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!user || Object.keys(conversationContactMap).length === 0) {
      return;
    }

    const channel = supabase
      .channel(`messages-sidebar-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const message = payload.new;

          if (processedMessageIds.current.has(message.id)) {
            return;
          }

          processedMessageIds.current.add(message.id);

          const contactId = conversationContactMap[message.conversation_id];

          if (!contactId) return;

          setPreviewByContactId((previous) => ({
            ...previous,
            [contactId]: message,
          }));

          if (message.sender_id === user.id) return;
          if (conversationId === message.conversation_id) return;

          setUnreadByContactId((previous) => ({
            ...previous,
            [contactId]: (previous[contactId] || 0) + 1,
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationContactMap, conversationId]);

  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const channel = supabase
      .channel(`receipts-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_receipts",
        },
        async (payload) => {
          const changedMessageId =
            payload.new?.message_id || payload.old?.message_id;

          if (!changedMessageId) return;

          const currentMessages = messagesRef.current;

          const isCurrentConversationMessage = currentMessages.some(
            (msg) => msg.id === changedMessageId,
          );

          if (isCurrentConversationMessage) {
            await loadMessageReceipts(currentMessages);
          }
        },
      )
      // .subscribe();
      .subscribe((status) => {
        console.log("Receipts Realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationId]);

  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = message;
  }, [message]);

  const emojiPickerRef = useRef(null);

  useEffect(() => {
    if (!openEmojiMessageId) return;

    const handleOutsideClick = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setOpenEmojiMessageId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [openEmojiMessageId]);

  useEffect(() => {
    if (!user || !conversationId) return;

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        async (payload) => {
          const affectedMessageId =
            payload.new?.message_id || payload.old?.message_id;

          const isCurrentConversationMessage = messagesRef.current.some(
            (message) => message.id === affectedMessageId,
          );

          if (isCurrentConversationMessage) {
            await loadReactions(messagesRef.current);
          }
        },
      )
      // .subscribe();

      .subscribe((status) => {
        console.log("Reactions Realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  // Send a message

  const handleSend = async (e) => {
    e.preventDefault();

    const content = newMessage.trim();

    if (!content || !conversationId || !user?.id || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const { data: newMsg, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        })
        .select("id, conversation_id, sender_id, content, created_at")
        .single();

      if (insertError) {
        throw insertError;
      }

      // Sender ki chat mein message foran add karo
      setMessage((previous) => {
        const alreadyExists = previous.some((item) => item.id === newMsg.id);

        if (alreadyExists) {
          return previous;
        }

        return [...previous, newMsg].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      });

      // Message successfully send hone ke baad input clear karo
      setNewMessage("");
    } catch (err) {
      console.error("Message send failed:", err);
      setError(err.message || "Message send nahi ho saka.");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    navigate("/", { replace: true });
  };

  const markConversationAsRead = async (conversationId, contactId) => {
    if (!user?.id || !conversationId) return;

    const readAt = new Date().toISOString();

    // 1. Conversation ko read mark karo
    const { error } = await supabase.from("conversation_reads").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        last_read_at: readAt,
      },
      {
        onConflict: "conversation_id,user_id",
      },
    );

    if (error) {
      console.error("Unable to update read status:", error.message);
      return;
    }

    // 2. Is conversation ke incoming messages fetch karo
    const { data: incomingMessages, error: messagesError } = await supabase
      .from("messages")
      .select("id, sender_id")
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id);

    if (messagesError) {
      console.error(
        "Could not fetch incoming messages:",
        messagesError.message,
      );
      return;
    }

    // 3. Incoming messages ko read mark karo
    if (incomingMessages?.length > 0) {
      const { error: receiptError } = await supabase.rpc(
        "mark_message_receipts",
        {
          p_message_ids: incomingMessages.map((msg) => msg.id),
          p_read: true,
        },
      );

      if (receiptError) {
        console.error("Read receipts update failed:", receiptError.message);
        return;
      }
    }

    // 4. Sidebar unread count zero karo
    if (contactId) {
      setUnreadByContactId((previous) => ({
        ...previous,
        [contactId]: 0,
      }));
    }
  };

  const loadReactions = async (messageList) => {
    // if (!messageList || messageList.length === 0) {
    //   setReactionsByMessageId({});
    //   return;
    // }

    if (!Array.isArray(messageList) || messageList.length === 0) {
      setReactionsByMessageId({});
      return;
    }

    // const messageIds = messageList.map((msg) => msg.id);
    const messageIds = messageList
      .filter((msg) => msg?.id)
      .map((msg) => msg.id);

    if (messageIds.length === 0) {
      setReactionsByMessageId({});
      return;
    }

    const { data, error } = await supabase
      .from("message_reactions")
      .select("id, message_id, user_id, emoji")
      .in("message_id", messageIds);

    if (error) {
      console.error("Could not load reactions:", error.message);
      return;
    }

    const grouped = {};

    for (const reaction of data ?? []) {
      if (!grouped[reaction.message_id]) {
        grouped[reaction.message_id] = [];
      }

      grouped[reaction.message_id].push(reaction);
    }

    setReactionsByMessageId(grouped);
  };

  const toggleReaction = async (messageId, emoji) => {
    if (!user?.id || !messageId || !emoji) return;
    if (reactionLoadingId === messageId) return;

    setReactionLoadingId(messageId);
    setError("");

    try {
      // 1. Check karo ke current user ka reaction pehle se hai ya nahi
      const { data: existing, error: findError } = await supabase
        .from("message_reactions")
        .select("id, emoji")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (findError) throw findError;

      if (existing?.emoji === emoji) {
        // Same emoji dobara click ho to reaction remove hoga
        const { error: deleteError } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;
      } else if (existing) {
        // Different emoji select ho to existing reaction replace hoga
        const { data: updated, error: updateError } = await supabase
          .from("message_reactions")
          .update({ emoji })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select("id, message_id, user_id, emoji");

        if (updateError) throw updateError;

        // RLS ki wajah se update zero rows kare to issue show hoga
        if (!updated || updated.length === 0) {
          throw new Error(
            "Reaction update nahi hua. Supabase UPDATE RLS policy check karein.",
          );
        }
        // } else {
        //   // Pehli baar reaction add hoga
        //   const { error: insertError } = await supabase
        //     .from("message_reactions")
        //     .insert({
        //       message_id: messageId,
        //       user_id: user.id,
        //       emoji,
        //     });

        //   if (insertError) throw insertError;
        // }
      } else {
        // Pehli baar reaction add hoga
        const { data: inserted, error: insertError } = await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          })
          .select("id, message_id, user_id, emoji")
          .single();

        if (insertError) throw insertError;

        if (!inserted) {
          throw new Error("Reaction insert nahi hua.");
        }
      }

      // UI ko database ke latest reactions ke saath refresh karo
      await loadReactions(messagesRef.current);
    } catch (err) {
      console.error("Reaction failed:", err);
      setError(err.message || "Reaction update nahi ho saka.");
    } finally {
      setReactionLoadingId(null);
    }
  };

  // Edit message functionality
  const handleEditMessage = async (messageId) => {
    const content = editContent.trim();

    if (!content || content.length > 5000 || messageActionLoading) {
      return;
    }

    setMessageActionLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("messages")
        // .update({ content, edited_at: new Date().toISOString() })
        .update({
          content: editContent.trim(),
          edited_at: new Date().toISOString(),
        })
        // .eq("id", messageId)
        // .eq("sender_id", user.id)
        // .select("id, conversation_id, sender_id, content, created_at")
        // .single();
        .eq("id", editingMessageId)
        .eq("sender_id", user.id)
        .select()
        .single();
      if (error) throw error;

      setMessage((previous) =>
        previous.map((message) => (message.id === messageId ? data : message)),
      );
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      setError(error.message);
    } finally {
      setMessageActionLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (messageActionLoading || !user?.id || !messageId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure, you want to delete this message ?",
    );
    if (!confirmed) return;
    setMessageActionLoading(true);
    // setConversationContactMap(false);
    setError("");

    try {
      const { data: deletedMessage, error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!deletedMessage) {
        throw new Error("Message doesn't Delete. Server Error 404");
      }

      setMessage((previous) =>
        previous.filter((message) => message.id !== messageId),
      );
      setReactionsByMessageId((previous) => {
        const updated = { ...previous };
        delete updated[messageId];
        return updated;
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setMessageActionLoading(false);
    }
  };

  const openMessageInfo = async (message) => {
    // if (!user || message.sender_id !== user.id) return;
    if (
      !user?.id ||
      !message?.id ||
      !message?.conversation_id ||
      !message?.sender_id ||
      message.sender_id !== user.id
    ) {
      console.error("Invalid message passed to Message Info:", message);
      return;
    }

    setInfoMessage(message);
    setInfoReadStatus(null);
    setInfoLoading(true);
    setError("");

    try {
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .select("id,user1_id,user2_id")
        .eq("id", message.conversation_id)
        .single();
      if (conversationError) throw conversationError;

      const otherUserId =
        conversation.user1_id === user.id
          ? conversation.user2_id
          : conversation.user1_id;

      // const { data: readStatus, error: readError } = await supabase
      //   .from("conversation_reads")
      //   .select("last_read_at")
      //   .eq("conversation_id", message.conversation_id)
      //   .eq("user_id", otherUserId)
      //   .maybeSingle();

      // if (readError) throw readError;

      // const readAt = readStatus?.last_read_at
      //   ? new Date(readStatus.last_read_at).getTime()
      //   : null;

      // const messageTime = new Date(message.created_at).getTime();

      // setInfoReadStatus({
      //   read: readAt !== null && readAt >= messageTime,
      //   lastReadAt: readStatus?.last_read_at ?? null,
      // });
      const { data: receipt, error: receiptError } = await supabase
        .from("message_receipts")
        .select("delivered_at, read_at")
        .eq("message_id", message.id)
        .eq("user_id", otherUserId)
        .maybeSingle();

      if (receiptError) throw receiptError;

      setInfoReadStatus({
        read: Boolean(receipt?.read_at),
        lastReadAt: receipt?.read_at ?? null,
        delivered: Boolean(receipt?.delivered_at),
        deliveredAt: receipt?.delivered_at ?? null,
      });
    } catch (error) {
      console.error("Message info error :", error);
      setError(error.message);
    } finally {
      setInfoLoading(false);
    }
  };

  const markMessagesAsDelivered = async (incomingMessages) => {
    if (!user || !incomingMessages?.length) return;
    const incoming = incomingMessages.filter(
      (message) => message.sender_id !== user.id,
    );
    if (incoming.length === 0) return;

    const receipts = incoming.map((message) => ({
      message_id: message.id,
      user_id: user.id,
      delivered_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("message_receipts").upsert(receipts, {
      onConflict: "message_id,user_id",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("Delivery receipts failed:", error.message);
    }
  };

  const loadMessageReceipts = async (messageList) => {
    // if (!messageList?.length) {
    //   setReceiptByMessageId({});
    //   return;
    // }
    if (!messageList?.length) {
      return;
    }
    const messageIds = messageList
      .filter(
        (msg) =>
          msg?.sender_id === user.id &&
          typeof msg.id === "string" &&
          msg.id.trim() !== "",
      )
      .map((msg) => msg.id);

    // if (messageIds.length === 0) {
    //   setReceiptByMessageId({});
    //   return;
    // }
    if (messageIds.length === 0) {
      return;
    }
    const { data, error } = await supabase
      .from("message_receipts")
      .select("message_id, user_id, delivered_at, read_at")
      .in("message_id", messageIds)
      .eq("user_id", selectedUser.id);

    if (error) {
      console.error("Could not load message receipts", error.message);
      return;
    }
    const grouped = {};
    for (const receipt of data ?? []) {
      grouped[receipt.message_id] = receipt;
    }
    setReceiptByMessageId(grouped);
    // setReceiptByMessageId((previous) => {
    //   const updated = { ...previous };

    //   for (const [messageId, newReceipt] of Object.entries(grouped)) {
    //     const oldReceipt = previous[messageId] || {};

    //     updated[messageId] = {
    //       ...oldReceipt,
    //       ...newReceipt,
    //       delivered_at:
    //         oldReceipt.delivered_at || newReceipt.delivered_at || null,
    //       read_at: oldReceipt.read_at || newReceipt.read_at || null,
    //     };
    //   }

    //   return updated;
    // });
  };

  // const markMessageAsRead = async (incomingMessages) => {
  //   if (!user?.id || !incomingMessages?.length) return;

  //   const messageIds = incomingMessages
  //     .filter((msg) => msg.sender_id !== user.id)
  //     .map((msg) => msg.id);

  //   const validMessageIds = messageIds.filter(
  //     (id) => typeof id === "string" && id.length > 0,
  //   );

  //   if (validMessageIds.length === 0) return;

  //   if (messageIds.length === 0) return;

  //   console.log("Current user ID:", user.id);
  //   console.log("Message IDs:", messageIds);

  //   const { error } = await supabase.rpc("mark_message_receipts", {
  //     p_message_ids: messageIds,
  //     p_read: true,
  //   });

  //   if (error) {
  //     console.error("Read receipt error:", error.message);
  //   }
  // };

  const markMessageAsRead = async (incomingMessages) => {
    if (!user?.id || !Array.isArray(incomingMessages)) return;

    const validMessageIds = incomingMessages
      .filter(
        (msg) =>
          msg?.sender_id &&
          msg.sender_id !== user.id &&
          typeof msg.id === "string" &&
          msg.id.trim() !== "",
      )
      .map((msg) => msg.id);

    if (validMessageIds.length === 0) return;

    console.log("Read receipt message IDs:", validMessageIds);

    const { error } = await supabase.rpc("mark_message_receipts", {
      p_message_ids: validMessageIds,
      p_read: true,
    });

    if (error) {
      console.error("Read receipt error:", error.message);
    }
  };

  return (
    <main className="chat-layout">
      <aside className="contacts-panel">
        <header className="contacts-header">
          <div>
            <h2>Talk Shak</h2>
            <small>{user?.email}</small>
          </div>

          <button onClick={handleLogout}>Logout</button>
        </header>
        <div className="contact-input">
          <span className="search-logo">
            <IoMdSearch size={20} />
          </span>

          <input
            className="input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search or Start a new chat"
          />
        </div>

        <h3>Contacts</h3>
        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center,",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                marginTop: "22px",
                fontSize: "22px",
                fontWeight: "bold",
                color: "#17a372",
              }}
            >
              Talk Shak
            </p>
            <p style={{ textAlign: "center" }}>
              <RiLoader2Fill className="contact-loader" />
            </p>
          </div>
        )}

        {!loading && profile.length === 0 && (
          <p className="userList-empty">
            No other users yet. Create a second test account.
          </p>
        )}
        {/* {profile.map((contact) => (
          <button
            key={contact.id}
            className={`contact ${
              selectedUser?.id === contact.id ? "active" : ""
            }`}
            onClick={() => openConversation(contact)}
          >
            <span className="contact-avatar">
              {(contact.full_name || "?").charAt(0).toUpperCase()}
            </span>

            <span>
              <strong>{contact.full_name || "New user"}</strong>
              <small>Open private chat</small>
            </span>
          </button>
        ))} */}
        {[...profile]
          .sort((a, b) => {
            const timeA = previewByContactId[a.id]?.created_at || "";
            const timeB = previewByContactId[b.id]?.created_at || "";

            return timeB.localeCompare(timeA);
          })
          .map((contact) => {
            const preview = previewByContactId[contact.id];

            return (
              <button
                key={contact.id}
                className={`contact ${
                  selectedUser?.id === contact.id ? "active" : ""
                }`}
                onClick={() => openConversation(contact)}
              >
                <span className="contact-avatar">
                  {(contact.full_name || "?").charAt(0).toUpperCase()}
                </span>

                <span className="contact-info">
                  <strong>{contact.full_name || "New user"}</strong>

                  <small className="last-message">
                    {preview
                      ? `${preview.sender_id === user.id ? "You: " : ""}${preview.content}`
                      : "Start a private chat"}
                  </small>
                </span>

                {preview && (
                  <small className="message-time">
                    {new Date(preview.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {(unreadByContactId[contact.id] || 0) > 0 && (
                      <span className="unread-badge">
                        {unreadByContactId[contact.id]}
                      </span>
                    )}
                  </small>
                )}
              </button>
            );
          })}
      </aside>

      <section className="conversation-panel">
        {!selectedUser ? (
          <div className="empty-chat">
            <h2>Your conversations</h2>
            <FaSignalMessenger size={100} color="#128c60" />
            <p>Select a contact to start a private chat ...</p>
          </div>
        ) : (
          <>
            <header className="conversation-header">
              <span className="contact-avatar">
                {(selectedUser.full_name || "?").charAt(0).toUpperCase()}
              </span>

              <h2>{selectedUser.full_name || "New user"}</h2>

              {message.length > 0 && (
                <small
                  style={{
                    paddingLeft: "10px",
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "row",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      color: "#128c60",
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  >
                    Active:
                  </div>

                  <div>
                    {new Date(
                      message[message.length - 1].created_at,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </small>
              )}
            </header>

            <div className="messages-list">
              {message.map((msg) => (
                <div key={msg.id} className="message-item">
                  <div
                    className={`message-bubble ${
                      msg.sender_id === user.id ? "mine" : "theirs"
                    }`}
                  >
                    {editingMessageId === msg.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleEditMessage(msg.id);
                        }}
                      >
                        <input
                          value={editContent}
                          onChange={(event) =>
                            setEditContent(event.target.value)
                          }
                          maxLength={5000}
                          required
                        />

                        <button type="submit" disabled={messageActionLoading}>
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditContent("");
                          }}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    <small>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                    {msg.sender_id === user.id && (
                      <small className="message-status">
                        {(() => {
                          const receipt = receiptByMessageId[msg.id];

                          if (receipt?.read_at) {
                            return "✓✓ Read";
                          }

                          if (receipt?.delivered_at) {
                            return "✓✓ Delivered";
                          }

                          return "✓ Sent";
                        })()}
                      </small>
                    )}

                    {msg.edited_at && (
                      <small className="edited-label">Edited</small>
                    )}
                  </div>

                  {msg.sender_id === user.id && (
                    <div className="message-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditContent(msg.content);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={messageActionLoading}
                        onClick={() => handleDeleteMessage(msg.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  {msg.sender_id === user.id && (
                    <button
                      type="button"
                      className="message-info-button"
                      // onClick={() => openMessageInfo(msg)}
                      // aria-label="View message information"
                      // title="Message info"
                      onClick={() => {
                        console.log("Message Info clicked:", msg);
                        console.log("Conversation ID:", msg?.conversation_id);
                        openMessageInfo(msg);
                      }}
                    >
                      <AiFillInfoCircle />
                    </button>
                  )}

                  <div className="message-reactions">
                    {(reactionsByMessageId[msg.id] || []).map((reaction) => (
                      <span
                        key={reaction.id}
                        className={
                          reaction.user_id === user.id
                            ? "reaction-chip my-reaction"
                            : "reaction-chip"
                        }
                        title={reaction.emoji}
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>

                  <div
                    className="emoji-reaction-wrapper"
                    ref={openEmojiMessageId === msg.id ? emojiPickerRef : null}
                  >
                    <button
                      type="button"
                      className="emoji-trigger"
                      onClick={() =>
                        setOpenEmojiMessageId((previous) =>
                          previous === msg.id ? null : msg.id,
                        )
                      }
                      aria-label="Open emoji picker"
                      title="React to message"
                    >
                      {/* This emoji */}
                      <MdEmojiEmotions />
                    </button>

                    {openEmojiMessageId === msg.id && (
                      <div className="emoji-picker">
                        {["❤️", "👍", "😂", "😮", "😢", "🙏"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="emoji-option"
                            disabled={reactionLoadingId === msg.id}
                            onClick={async () => {
                              setOpenEmojiMessageId(null);
                              await toggleReaction(msg.id, emoji);
                            }}
                            aria-label={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {infoMessage && (
              <div
                className="message-info-overlay"
                onClick={() => setInfoMessage(null)}
              >
                <section
                  className="message-info-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="message-info-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="message-info-header">
                    <h3 id="message-info-title">Message Info</h3>

                    <button
                      type="button"
                      onClick={() => setInfoMessage(null)}
                      aria-label="Close message information"
                    >
                      ×
                    </button>
                  </div>

                  <p className="message-info-content">{infoMessage.content}</p>

                  <div className="message-info-row">
                    <span>Sent</span>
                    <span>
                      {new Date(infoMessage.created_at).toLocaleString()}
                    </span>
                  </div>

                  {infoMessage.edited_at && (
                    <div className="message-info-row">
                      <span>Edited</span>
                      <span>
                        {new Date(infoMessage.edited_at).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="message-info-row">
                    <span>Read status</span>

                    <span>
                      {infoLoading
                        ? "Checking..."
                        : infoReadStatus?.read
                          ? "Read"
                          : "Not read yet"}
                    </span>
                  </div>
                </section>
              </div>
            )}

            <form className="message-form" onSubmit={handleSend}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write a message..."
                maxLength={5000}
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || sending || !conversationId}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
};

export default Chat;
