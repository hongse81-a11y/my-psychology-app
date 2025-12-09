import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from './firebase'; 
import { doc, setDoc } from "firebase/firestore"; 
import { getUserId } from './userId'; // ★ 1. 사용자 ID 가져오기 기능 추가

function ChildhoodSurvey({ onComplete }) {
  // 전문적인 분석을 위한 5가지 섹션 데이터
  const [formData, setFormData] = useState({
    emotionalClimate: '', // 1. 가정의 정서적 분위기
    relationshipMother: '', // 2. 어머니와의 관계
    relationshipFather: '', // 3. 아버지와의 관계
    schoolLife: '', // 4. 학창시절 및 교우관계
    coreIssue: '' // 5. 현재 가장 고치고 싶은 성격
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // 입력값 처리 함수
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAnalyze = async () => {
    // 빈칸 체크
    const isAllFilled = Object.values(formData).every(val => val.trim() !== '');
    if (!isAllFilled) {
      alert("정확한 분석을 위해 모든 항목을 성실히 작성해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // ★ 전문가용 프롬프트 (Schema Therapy 기반)
      const prompt = `
        당신은 임상 심리 전문가입니다. 아래 내담자의 '초기 기억 및 성장 배경'을 분석하여 심리 프로필을 작성해주세요.
        
        [내담자 진술]
        1. 가정의 정서적 분위기: ${formData.emotionalClimate}
        2. 어머니와의 관계: ${formData.relationshipMother}
        3. 아버지와의 관계: ${formData.relationshipFather}
        4. 학창시절 및 사회성: ${formData.schoolLife}
        5. 현재 호소하는 핵심 문제: ${formData.coreIssue}

        [분석 요청 사항]
        위 데이터를 바탕으로 다음 내용을 분석하여 JSON으로 반환하세요.
        1. psycho_tags: 내담자를 설명하는 심리학적 키워드 5개 (예: #불안정애착, #정서적방임, #인정욕구 등)
        2. analysis_summary: 
           - 내담자의 '애착 유형(Attachment Style)' 추정
           - 형성되었을 가능성이 높은 '초기 부적응 도식(Schemas)' (예: 버림받음, 결함, 엄격한 기준 등)
           - 현재 문제와 과거 경험의 연결 고리 해석
           위 내용을 포함하여 전문가스러운 어조로 3~4문장 요약.

        응답 형식 (JSON Only):
        {
          "psycho_tags": ["#태그1", "#태그2", ...],
          "analysis_summary": "분석 내용..."
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const analysisData = JSON.parse(cleanJson);

      // ★ 2. Firebase에 저장 (test_user 대신 getUserId() 사용)
      await setDoc(doc(db, "users", getUserId()), {
        childhood_data: {
          ...formData, // 원본 설문 데이터도 저장
          psycho_tags: analysisData.psycho_tags,
          analysis_summary: analysisData.analysis_summary,
          analyzed_at: new Date().toISOString()
        }
      }, { merge: true });

      alert("심층 분석이 완료되었습니다. 상담 세션을 시작합니다.");
      
      // App.js에 "분석 끝났으니 화면 넘겨줘"라고 신호 보냄
      if(onComplete) onComplete();

    } catch (error) {
      console.error("Error:", error);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>📋 심층 심리 분석지</h1>
        <p style={{ color: '#666', marginTop: '10px' }}>
          이 설문은 <strong>단 한 번</strong> 진행됩니다.<br/>
          AI 상담사가 당신을 깊이 이해할 수 있도록 최대한 솔직하고 구체적으로 적어주세요.
        </p>
      </header>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <section>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>1. 어린 시절 가정의 정서적 분위기는?</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '5px' }}>예: 부모님이 자주 싸우셨나요? 대화가 많았나요? 집이 안전한 공간이었나요?</p>
          <textarea 
            name="emotionalClimate"
            style={textAreaStyle}
            value={formData.emotionalClimate}
            onChange={handleChange}
            placeholder="자유롭게 기술해주세요..."
          />
        </section>

        <section>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>2. 어머니(주양육자)와의 관계는?</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '5px' }}>예: 따뜻했나요? 통제적이었나요? 힘들 때 위로받을 수 있었나요?</p>
          <textarea 
            name="relationshipMother"
            style={textAreaStyle}
            value={formData.relationshipMother}
            onChange={handleChange}
            placeholder="어머니에 대한 기억..."
          />
        </section>

        <section>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>3. 아버지(제2양육자)와의 관계는?</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '5px' }}>예: 무서웠나요? 무관심했나요? 함께 놀아주셨나요?</p>
          <textarea 
            name="relationshipFather"
            style={textAreaStyle}
            value={formData.relationshipFather}
            onChange={handleChange}
            placeholder="아버지에 대한 기억..."
          />
        </section>

        <section>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>4. 학창 시절 및 또래 관계는?</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '5px' }}>예: 왕따 경험이 있나요? 친구 사귀기가 쉬웠나요? 선생님과의 관계는?</p>
          <textarea 
            name="schoolLife"
            style={textAreaStyle}
            value={formData.schoolLife}
            onChange={handleChange}
            placeholder="학교 생활에 대해..."
          />
        </section>

        <section>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>5. 현재 가장 해결하고 싶은 성격적 문제는?</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '5px' }}>예: 거절을 못해요, 쉽게 화가 나요, 늘 불안해요 등</p>
          <textarea 
            name="coreIssue"
            style={textAreaStyle}
            value={formData.coreIssue}
            onChange={handleChange}
            placeholder="가장 고치고 싶은 점..."
          />
        </section>

        <button 
          onClick={handleAnalyze} 
          disabled={isLoading}
          style={{ 
            marginTop: '20px',
            padding: '18px', 
            backgroundColor: isLoading ? '#ccc' : '#2D3436', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: '0.3s'
          }}
        >
          {isLoading ? '심층 분석 중입니다 (약 10초 소요)... 🧠' : '분석 완료 및 저장하기'}
        </button>
      </div>
    </div>
  );
}

const textAreaStyle = {
  width: '100%', 
  height: '80px', 
  padding: '12px', 
  borderRadius: '8px',
  border: '1px solid #ddd',
  fontSize: '15px',
  resize: 'vertical',
  boxSizing: 'border-box'
};

export default ChildhoodSurvey;