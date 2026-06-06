'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  Check,
  MessageSquarePlus,
  PanelRightClose,
  Pencil,
  PanelLeftOpen,
  SendHorizontal,
  Trash2,
} from 'lucide-react';
import { useChatPanel } from '@/components/chat/chat-panel-context';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  ProposalCard,
  type Proposal,
  type ProposalStatus,
} from '@/components/ui/proposal-card';
import { cn } from '@/lib/utils';

type Role = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  streaming?: boolean;
  proposal?: Proposal;
  proposalStatus?: ProposalStatus;
  resultText?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastActivityAt: number;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const sampleProposal: Proposal = {
  origin: 'TON / STON',
  destination: 'TON / USDT',
  estimatedYield: '+$18.40/wk',
  x402Fee: '$0.50',
  netGain: '+$17.90/wk',
  confidence: 0.92,
  explanation:
    'Net gain clears your $5 minimum after swap fees and slippage, and the move stays within your eligible assets and spending floor.',
};

const initialSessions: ChatSession[] = [
  {
    id: uid(),
    title: 'Best USDT pool right now',
    lastActivityAt: Date.now() - 1000 * 60 * 12,
    messages: [
      { id: uid(), role: 'user', content: 'Where should my idle USDT be?' },
      {
        id: uid(),
        role: 'assistant',
        content:
          'Your idle balance is $4,820 earning nothing. The strongest venue right now is TON / USDT at 18.4% APR. Say "rebalance" and I will draw up a proposal.',
      },
    ],
  },
  {
    id: uid(),
    title: 'Explain x402 fees',
    lastActivityAt: Date.now() - 1000 * 60 * 60 * 4,
    messages: [
      { id: uid(), role: 'user', content: 'What do the x402 fees cover?' },
      {
        id: uid(),
        role: 'assistant',
        content:
          'You pay a small fixed x402 micropayment only when a rebalance executes. No subscriptions and no spreads, so the agent earns only when you earn.',
      },
    ],
  },
];

function buildReply(text: string): { content: string; proposal?: Proposal } {
  if (/rebalance|move|yield|pool|swap|better|deploy/i.test(text)) {
    return {
      content:
        'I scanned STON.fi and found a better venue for your idle USDT. Moving into TON / USDT lifts your APR from 9.4% to 18.4%. Here is the proposal:',
      proposal: sampleProposal,
    };
  }
  return {
    content:
      'Your positions are earning a blended 12.1% APR with $4,820 still idle. Ask me to scan for a better pool or to rebalance whenever you want.',
  };
}

export function ChatPanel() {
  const { isOpen, close } = useChatPanel();

  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [activeId, setActiveId] = useState<string>(initialSessions[0].id);
  const [view, setView] = useState<'thread' | 'sessions'>('thread');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId]
  );

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, view]);

  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.lastActivityAt - a.lastActivityAt),
    [sessions]
  );

  const patchMessage = (
    sessionId: string,
    messageId: string,
    patch: (m: ChatMessage) => ChatMessage
  ) =>
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? patch(m) : m
              ),
            }
          : s
      )
    );

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isStreaming || !activeSession) return;

    const sessionId = activeSession.id;
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text };
    const assistantId = uid();
    const reply = buildReply(text);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              lastActivityAt: Date.now(),
              messages: [
                ...s.messages,
                userMsg,
                { id: assistantId, role: 'assistant', content: '', streaming: true },
              ],
            }
          : s
      )
    );
    setInput('');
    setIsStreaming(true);

    const words = reply.content.split(' ');
    words.forEach((_, i) => {
      const t = setTimeout(() => {
        patchMessage(sessionId, assistantId, (m) => ({
          ...m,
          content: words.slice(0, i + 1).join(' '),
        }));
        if (i === words.length - 1) {
          patchMessage(sessionId, assistantId, (m) => ({
            ...m,
            streaming: false,
            proposal: reply.proposal,
            proposalStatus: reply.proposal ? 'proposed' : undefined,
          }));
          setIsStreaming(false);
        }
      }, 35 * (i + 1));
      timers.current.push(t);
    });
  };

  const approve = (sessionId: string, messageId: string) => {
    patchMessage(sessionId, messageId, (m) => ({
      ...m,
      proposalStatus: 'executing',
    }));
    const t = setTimeout(() => {
      patchMessage(sessionId, messageId, (m) => ({
        ...m,
        proposalStatus: 'completed',
        resultText: 'Rebalanced. Earned $18.40, fee $0.50.',
      }));
    }, 1900);
    timers.current.push(t);
  };

  const dismiss = (sessionId: string, messageId: string) =>
    patchMessage(sessionId, messageId, (m) => ({
      ...m,
      proposalStatus: 'dismissed',
    }));

  const newChat = () => {
    const session: ChatSession = {
      id: uid(),
      title: 'New chat',
      messages: [],
      lastActivityAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(session.id);
    setView('thread');
  };

  const commitRename = (id: string) => {
    const title = renameValue.trim();
    if (title) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title } : s))
      );
    }
    setRenamingId(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== pendingDelete);
      if (pendingDelete === activeId) {
        setActiveId(next[0]?.id ?? '');
      }
      return next;
    });
    setPendingDelete(null);
  };

  return (
    <>
      <aside
        className={cn(
          'fixed right-0 top-0 z-[60] flex h-screen w-full flex-col border-l border-white/10 bg-black transition-transform duration-300 ease-in-out sm:w-[400px] lg:w-[360px]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <button
            onClick={() => setView((v) => (v === 'thread' ? 'sessions' : 'thread'))}
            aria-label="Toggle sessions"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-white">
            {view === 'sessions' ? 'Chats' : activeSession?.title ?? 'Tonyx AI'}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={newChat}
              aria-label="New chat"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={close}
              aria-label="Close chat"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <PanelRightClose className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Session list */}
        {view === 'sessions' ? (
          <div className="flex-1 overflow-y-auto p-3">
            {orderedSessions.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No chats yet.
              </p>
            )}
            <ul className="space-y-1">
              {orderedSessions.map((s) => (
                <li key={s.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors',
                      s.id === activeId ? 'bg-accent/15' : 'hover:bg-white/5'
                    )}
                  >
                    {renamingId === s.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(s.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="h-7 flex-1 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white focus:border-accent/40 focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setActiveId(s.id);
                          setView('thread');
                        }}
                        className={cn(
                          'flex-1 truncate text-left text-sm',
                          s.id === activeId ? 'text-accent' : 'text-white/80'
                        )}
                      >
                        {s.title}
                      </button>
                    )}

                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {renamingId === s.id ? (
                        <button
                          onClick={() => commitRename(s.id)}
                          aria-label="Save name"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-accent hover:bg-white/10"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setRenamingId(s.id);
                            setRenameValue(s.title);
                          }}
                          aria-label="Rename chat"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        onClick={() => setPendingDelete(s.id)}
                        aria-label="Delete chat"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          /* Thread */
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!activeSession || activeSession.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-white">Ask Tonyx anything</p>
                <p className="max-w-[240px] text-xs text-muted-foreground">
                  Try &ldquo;rebalance my idle USDT&rdquo; or &ldquo;which pool pays best?&rdquo;
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSession.messages.map((m) => (
                  <div key={m.id}>
                    <div
                      className={cn(
                        'flex',
                        m.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                          m.role === 'user'
                            ? 'bg-accent/15 text-white'
                            : 'bg-white/5 text-white/90'
                        )}
                      >
                        {m.content}
                        {m.streaming && (
                          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent align-middle" />
                        )}
                      </div>
                    </div>
                    {m.proposal && (
                      <div className="mt-3">
                        <ProposalCard
                          proposal={m.proposal}
                          status={m.proposalStatus}
                          resultText={m.resultText}
                          onApprove={() => approve(activeSession.id, m.id)}
                          onDismiss={() => dismiss(activeSession.id, m.id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Composer */}
        {view === 'thread' && (
          <div className="shrink-0 border-t border-white/10 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-accent/40">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message Tonyx..."
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </aside>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete chat?"
      >
        <p className="text-sm text-muted-foreground">
          This removes the chat from your list. Message history is retained for
          cross-session memory so Tonyx keeps its context.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button size="sm" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
