import { Info } from "lucide-react";

export default function StorageNotice({ compact = false }: { compact?: boolean }) {
  return <aside className="storage-notice" aria-label="자료 보관 주의사항">
    <Info size={18} aria-hidden="true" />
    <div>
      <strong>탭을 닫으면 임시 자료가 사라져요.</strong>
      <p>작성 중인 디자인·주문·견적 도안은 미리 저장하거나 내려받아주세요. ‘저장’을 누른 디자인은 같은 브라우저에 남아요.</p>
      <details><summary>자료 보관 안내 자세히 보기</summary>
        <p>입력한 디자인 설정과 주문 정보, 시연 주문·견적 도안은 현재 탭에만 보관돼요. 새로고침하면 유지되지만 탭을 닫으면 사라져요.</p>
        <p>생성된 의상 미리보기와 전달 완료 화면은 별도로 저장되지 않아 새로고침해도 초기화돼요.</p>
        <p>‘저장’을 누른 디자인과 별도로 보관함에 저장한 파일은 같은 기기·브라우저에서 다시 볼 수 있어요. 서버 백업과 다른 기기와의 동기화는 제공하지 않아요.</p>
        <p>브라우저 데이터 삭제·시크릿 모드 종료 시 저장한 자료도 사라질 수 있어요. 중요한 파일은 별도로 내려받아주세요.</p>
        {!compact && <p>공용 기기에서는 개인정보 입력과 자료 보관에 주의해주세요. 저장한 자료는 같은 브라우저를 쓰는 다른 사람도 볼 수 있어요.</p>}
      </details>
    </div>
  </aside>;
}
