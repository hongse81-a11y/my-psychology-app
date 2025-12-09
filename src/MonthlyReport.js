import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from './firebase';
import { collection, query, where, getDocs } from "firebase/firestore";

function MonthlyReport() {
  const [loading, setLoading] = useState(false);
  // ★ 여기에 본인 지메일 주소를 적으세요!
  const myEmail = "hongse81@gmail.com"; 
  // ★ 아까 받은 16자리 앱 비밀번호를 여기에 적으세요!
  const myAppPassword = "hvdh fkta ghrf sffg"; 

  const handleMonthlyAnalysis = async () => {
    if (!window.confirm("이번 달 심리 분석 보고서를 메일로 받으시겠습니까?")) return;
    
    setLoading(true);

    try {
      // 1. 이번 달 일기 싹 긁어오기
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0'); // 예: "12"
      const startDay = `${year}-${month}-01`;
      const endDay = `${year}-${month}-31`;

      // Firebase에서 이번 달 데이터 검색
      const q = query(
        collection(db, "daily_logs"),
        where("date", ">=", startDay),
        where("date", "<=", endDay)
      );
      
      const querySnapshot = await getDocs(q);
      let allJournals = "";
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allJournals += `[${data.date}] 기분:${data.moodScore}점, 감정:${data.primaryEmotion}\n일기: ${data.journal}\n\n`;
      });

      if (!allJournals) {
        alert("이번 달에 작성된 일기가 없어요! 😅");
        setLoading(false);
        return;
      }

      // 2. 제미나이에게 종합 분석 시키기
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        다음은 사용자가 ${month}월 한 달 동안 작성한 일기 모음입니다.
        이 데이터를 바탕으로 '월간 심리 분석 보고서'를 HTML 형식으로 작성해주세요.
        
        [일기 데이터]
        ${allJournals}
        
        [보고서 포함 내용]
        1. <h2>${month}월의 마음 날씨 요약</h2>: 전체적인 기분 흐름과 주요 감정 키워드
        2. <h3>주요 심리 변화 패턴</h3>: 기분이 좋았던 날과 힘들었던 날의 특징 분석
        3. <h3>심리상담사의 따뜻한 조언</h3>: 다음 달을 위해 마음을 챙기는 구체적인 방법 제안
        4. <div style="background:#f0f8ff; padding:15px; border-radius:10px;"><strong>💡 이달의 문장</strong>: 사용자에게 힘이 될 명언이나 문구 하나</div>
        
        디자인은 깔끔하고 보기 좋게 <p>, <ul>, <li> 태그를 사용해서 작성해줘.
      `;

      const result = await model.generateContent(prompt);
      const reportHtml = await result.response.text();

      // 3. 이메일 보내기 (Electron에게 시킴)
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        const emailResult = await ipcRenderer.invoke('send-email', {
          toEmail: myEmail,
          subject: `[심리상담사] ${year}년 ${month}월 마음 분석 보고서가 도착했습니다 💌`,
          htmlContent: reportHtml,
          googleAppPassword: myAppPassword
        });

        if (emailResult.success) {
          alert(`메일 발송 성공! 📩\n${myEmail}함을 확인해주세요.`);
        } else {
          alert("메일 전송 실패: " + emailResult.error);
        }
      }

    } catch (error) {
      console.error(error);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '50px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '30px' }}>
      <h3 style={{ color: '#555' }}>📅 월간 리포트</h3>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '15px' }}>
        이번 달 나의 감정 흐름을 한눈에 보고 싶다면?
      </p>
      
      <button 
        onClick={handleMonthlyAnalysis} 
        disabled={loading}
        style={{
          background: loading ? '#ccc' : '#6C5CE7', // 보라색 버튼
          color: 'white',
          padding: '12px 25px',
          border: 'none',
          borderRadius: '25px',
          fontSize: '15px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(108, 92, 231, 0.3)'
        }}
      >
        {loading ? '데이터 분석 및 메일 전송 중... 🚀' : '이번 달 분석 보고서 메일로 받기 📧'}
      </button>
    </div>
  );
}

export default MonthlyReport;