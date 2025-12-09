import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from './firebase';
import { doc, getDoc, addDoc, collection, updateDoc, deleteField } from "firebase/firestore";
import HealingRecommendation from './HealingRecommendation';
import MonthlyReport from './MonthlyReport'; 
import { getUserId } from './userId';

function DailyCheckIn() {
  const [moodScore, setMoodScore] = useState(5);
  const [primaryEmotion, setPrimaryEmotion] = useState('평온함');
  const [journal, setJournal] = useState('');
  const [myChildhoodData, setMyChildhoodData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [counselingResult, setCounselingResult] = useState('');

  // 데이터 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = getUserId();
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().childhood_data) {
          setMyChildhoodData(docSnap.data().childhood_data);
        }
      } catch (e) {
        console.error("데이터 로딩 실패:", e);
      }
    };
    fetchUserData();
  }, []);

  // 마음 진단 함수
  const handleCheckIn = async () => {
    if (!journal) {
      alert("오늘의 마음 일기를 짧게라도 써주세요!");
      return;
    }
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const tags = myChildhoodData?.psycho_tags?.join(', ') || "정보 없음";
      const pastSummary = myChildhoodData?.analysis_summary || "정보 없음";

      const prompt = `
        당신은 따뜻하고 통찰력 있는 심리상담사입니다.
        [내담자 정보] 키워드: ${tags}, 요약: ${pastSummary}
        [오늘의 상태] 기분: ${moodScore}점, 감정: ${primaryEmotion}, 일기: ${journal}
        위 정보를 바탕으로 공감, 과거와의 연결 해석, 내일의 행동 제안을 포함해 따뜻하게 상담해줘.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setCounselingResult(text);

      await addDoc(collection(db, "daily_logs"), {
        uid: "getUserId()",
        date: new Date().toISOString().split('T')[0],
        moodScore,
        primaryEmotion,
        journal,
        counselingResult: text
      });

      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        const sheetResult = await ipcRenderer.invoke('save-to-sheet', {
          date: new Date().toISOString().split('T')[0],
          moodScore,
          primaryEmotion,
          journal,
          counselingResult: text
        });

        if (sheetResult.success) {
          alert("✅ 구글 시트에도 안전하게 기록되었습니다!");
        } else {
          alert("⚠️ 구글 시트 저장 실패!\n이유: " + sheetResult.error);
        }
      }

    } catch (error) {
      console.error("Error:", error);
      alert("상담 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // ★ 2. 초기화 기능 함수 (함수 안에 있어야 합니다)
  const handleResetData = async () => {
    if (window.confirm("정말 모든 성장 배경 데이터를 삭제하고 다시 설문하시겠습니까?")) {
      try {
        const userRef = doc(db, "users", "getUserId()");
        await updateDoc(userRef, {
          childhood_data: deleteField()
        });
        alert("초기화되었습니다. 앱을 새로고침합니다.");
        window.location.reload(); 
      } catch (e) {
        console.error("초기화 실패:", e);
        alert("초기화 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#4a4a4a' }}>🌙 오늘의 마음 날씨</h2>
      <p style={{ textAlign: 'center', marginBottom: '30px' }}>오늘 하루, 당신의 마음은 어땠나요?</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label>
          <strong>1. 기분 점수 (1~10)</strong> : {moodScore}점
          <input 
            type="range" min="1" max="10" 
            style={{ width: '100%', marginTop: '5px' }}
            value={moodScore}
            onChange={(e) => setMoodScore(e.target.value)}
          />
        </label>

        <label>
          <strong>2. 오늘의 주요 감정</strong>
          <select 
             value={primaryEmotion} 
             onChange={(e) => setPrimaryEmotion(e.target.value)}
          >
            <option value="평온함">😌 평온함</option>
            <option value="기쁨">😆 기쁨/설렘</option>
            <option value="뿌듯함">🏆 뿌듯함</option>
            <option value="불안">😰 불안/초조</option>
            <option value="우울">💧 우울/슬픔</option>
            <option value="분노">😡 분노/짜증</option>
            <option value="무기력">🫠 무기력</option>
          </select>
        </label>

        <label>
          <strong>3. 마음 일기</strong>
          <textarea 
            style={{ height: '100px' }}
            placeholder="오늘 마음을 힘들게 하거나 기쁘게 한 일은 무엇인가요?"
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
          />
        </label>

        <button onClick={handleCheckIn} disabled={isLoading}>
          {isLoading ? '상담사가 내용을 읽고 있어요... 💌' : '마음 진단 받기'}
        </button>
      </div>

      {counselingResult && (
        <div style={{ marginTop: '40px', borderTop: '2px dashed #ddd', paddingTop: '30px' }}>
          <div style={{ 
            padding: '25px', 
            backgroundColor: '#FFF0F5', 
            borderRadius: '15px', 
            whiteSpace: 'pre-line',
            marginBottom: '30px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ marginTop: 0, color: '#D81B60' }}>💌 마음 처방전</h3>
            <p style={{ lineHeight: '1.7', fontSize: '16px', color: '#444' }}>
              {counselingResult}
            </p>
          </div>

          <HealingRecommendation 
            currentEmotion={primaryEmotion} 
            analysisSummary={counselingResult} 
          />
        </div>
      )}

      <div style={{ marginTop: '60px', marginBottom: '40px' }}>
        <hr style={{ border: '0', height: '1px', background: '#eee' }} />
        <MonthlyReport />
      </div>

      {/* ★ 3. 초기화 버튼은 여기(맨 아래)에 추가합니다! */}
      <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '30px' }}>
        <button 
          onClick={handleResetData}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#999', 
            textDecoration: 'underline', 
            cursor: 'pointer', 
            fontSize: '12px',
            boxShadow: 'none' // 기존 버튼 스타일 덮어쓰기
          }}
        >
          🔄 성장 배경 데이터 초기화 (다시 설문하기)
        </button>
      </div>

    </div>
  );
}

export default DailyCheckIn;