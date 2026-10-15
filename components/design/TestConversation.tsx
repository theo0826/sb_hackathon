"use client";
import { useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { mockDesign, simpleDesign } from "@/lib/design";
import { useDesignSession } from "@/lib/design-session";

export default function TestConversation({ disabled }: { disabled: boolean }) {
  const session = useDesignSession();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ id: string; prompt: string; reply: string }[]>([]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const prompt = input.trim(); if (!prompt || disabled) return;
    session.setDesign(current => simpleDesign({ ...current, ...mockDesign(prompt, current) })); session.setHasResult(true);
    setHistory(items => [...items, { id: crypto.randomUUID(), prompt, reply: "단색 반팔티에 로고 배치를 반영했어요. 티셔츠 색상과 로고 위치·크기를 바꿔보세요." }].slice(-10)); setInput("");
  }
  return <section className="test-conversation" aria-labelledby="test-title">
    <div className="test-intro"><h2 id="test-title">먼저, 가볍게 테스트.</h2><p>AI 비용 없이 예시 디자인을 바꿔보세요.<br />이 대화는 이 브라우저에서만 처리됩니다.</p><p className="test-detail">새 그림 생성은 지원하지 않아요. 위의 저장 버튼과 제작자료 저장은 비공개 클라우드를 사용합니다.</p></div>
    <div className="test-chat">
      {history.length > 0 && <div className="test-messages" role="log" aria-label="무료 테스트 대화" aria-live="polite">{history.map(item => <div key={item.id}><p className="test-user">{item.prompt}</p><p>{item.reply}</p></div>)}</div>}
      <div className="test-examples">{['검정 반팔에 로고를 왼쪽 가슴에 작게', '업로드 이미지를 왼쪽 가슴과 등판에 넣어줘', '문구는 "OUR CLUB"', '등판 로고를 더 크게'].map(text => <button type="button" key={text} disabled={disabled} onClick={() => setInput(text)}>{text}</button>)}</div>
      <form className="test-composer" onSubmit={submit}><label htmlFor="test-prompt" className="sr-only">무료 테스트 지시사항</label><textarea id="test-prompt" rows={2} value={input} maxLength={300} disabled={disabled} onChange={event => setInput(event.target.value)} placeholder={'예: 네이비 반팔에 문구는 "OUR CLUB"'} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="submit" disabled={!input.trim() || disabled} aria-label="무료 테스트 적용"><ArrowUp size={20} /></button></form>
    </div>
  </section>;
}
