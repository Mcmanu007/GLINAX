"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { v4 as uuidv4 } from "uuid";
import api from "@/lib/api";
import { commitChat } from "@/lib/CommitChat";
import SummarizeModal from "./summarization/SummarizeModal"; // ✅ updated path

import ChatMessages from "./chats/ChatMessages";
import ChatInput from "./chats/ChatInput";
import ChatTools from "./chats/ChatTools";
import QuestionModal from "./questions/QuestionToolModal";
import QuestionViewer from "./questions/QuestionViewer";
import GuestLimitModal from "./GuestLimitModal";
import PageLoader from "./ui/PageLoader";
import { Question } from "@/types/Question";

interface ChatBoxProps {
  chatId: number | null;
  onChatChange: (id: number | null) => void;
  onTitleUpdate: (id: number, newTitle: string) => void;
}

export default function ChatBox({ chatId, onChatChange, onTitleUpdate }: ChatBoxProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ prompt: string; response: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionContext, setQuestionContext] = useState<string>("");
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerMinimized, setViewerMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSummarizeModal, setShowSummarizeModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleOpenSummarize = () => setShowSummarizeModal(true);
  const handleCloseSummarize = () => setShowSummarizeModal(false);

  const handleSummaryResult = (text: string) => {
    setMessages(prev => [...prev, { prompt: "📄 Summary:", response: text }]);
  };

  useEffect(() => {
    let guestId = Cookies.get("guest_id");
    if (!guestId) {
      guestId = uuidv4();
      Cookies.set("guest_id", guestId, { expires: 7 });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const inv = localStorage.getItem("questionViewer");
      const viewerDone = localStorage.getItem("viewerDone");

      if (inv && viewerDone !== "true") {
        const parsed = JSON.parse(inv);
        const { questions, context, submitted } = parsed;

        if (Array.isArray(questions) && questions.length > 0 && submitted) {
          setQuestions(questions);
          setQuestionContext(context || "");
          setViewerVisible(true);
          setViewerMinimized(false);
          localStorage.setItem("viewerDone", "true");
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to load viewer from inventory", err);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 1000); // simulate
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem("questions", JSON.stringify(questions));
      localStorage.setItem("question_context", questionContext);
    }
  }, [questions, questionContext]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) {
        setMessages([]);
        return;
      }

      try {
        const res = await api.get(`/chat/history/${chatId}/`);
        const formatted = res.data.map((msg: any) => ({
          prompt: msg.prompt,
          response: msg.response,
        }));
        setMessages(formatted);
      } catch {
        setError("Unable to load chat history. Please try again.");
      }
    };

    fetchMessages();
  }, [chatId]);

  const handleSend = async () => {
    setError(null);
    if (!input.trim()) return;

    const guestId = Cookies.get("guest_id");
    setIsSending(true);
    try {
      const res = await api.post("/chat/", {
        prompt: input,
        chat_id: chatId,
        guest_id: guestId,
      });

      if (res.data.limit_exceeded) {
        setLimitReached(true);
        setIsSending(false);
        router.push("/auth/login/");
        return;
      }

      const reply = res.data.response;
      const newChatId = res.data.chat_id;
      const updatedMessages = [...messages, { prompt: input, response: reply }];
      setMessages(updatedMessages);
      setInput("");
      setIsSending(false);

      if (!chatId && newChatId) {
        onChatChange(newChatId);
      }

      if (updatedMessages.length === 2 && !committed && newChatId) {
        try {
          const result = await commitChat(newChatId, updatedMessages);
          if (result?.title) {
            onTitleUpdate(newChatId, result.title);
          }
          setCommitted(true);
        } catch {
          // Silent fail
        }
      }
    } catch (err: any) {
      const fallback = "Something went wrong. Please try again.";
      const errMsg = err.response?.data?.error || fallback;
      setError(errMsg);
      setIsSending(false);
    }
  };

  const handleQuestionsGenerated = (prompt: string, qs: Question[], context: string) => {
    if (!qs || qs.length === 0) return;

    setQuestions(qs);
    setQuestionContext(context);
    setViewerVisible(true);
    setViewerMinimized(false);

    localStorage.setItem("questions", JSON.stringify(qs));
    localStorage.setItem("question_context", context);
    localStorage.setItem("questionViewer", JSON.stringify({ questions: qs, context, submitted: false }));

    setShowQuestionModal(false);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col h-screen p-4 max-w-3xl mx-auto relative">
      <ChatTools 
        onGenerateQuestions={() => setShowQuestionModal(true)}
        onSummarize={handleOpenSummarize}
      />

      <ChatMessages messages={messages} messagesEndRef={messagesEndRef} isSending={isSending} />

      {isSending && (
        <div className="flex items-start gap-2 p-2 text-sm text-gray-500 italic">
          AI is typing...
        </div>
      )}
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <ChatInput
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        disabled={limitReached}
        loading={isSending}
      />

      {limitReached && <GuestLimitModal />}

      <QuestionModal
        open={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        onGenerated={handleQuestionsGenerated}
      />

      {questions.length > 0 && (
        <QuestionViewer
          questions={questions}
          context={questionContext}
          onClose={() => {
            setViewerVisible(false);
            setViewerMinimized(false);
            setQuestions([]);
            setQuestionContext("");
            localStorage.removeItem("questionViewer");
            localStorage.removeItem("viewerDone");
          }}
          minimized={!viewerVisible && viewerMinimized}
          onMinimize={setViewerMinimized}
        />
      )}

      {showSummarizeModal && (
        <SummarizeModal
          onClose={handleCloseSummarize}
          onSummary={handleSummaryResult}
        />
      )}
    </div>
  );
}
