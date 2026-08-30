import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BaseModal from '../Common/BaseModal';
import styles from './AiCommandModal.module.css';
import { generatePlan, executePlan } from '../../services/aiService';
import toast from 'react-hot-toast';

const AiCommandModal = ({ isOpen, onClose, workspaceId }) => {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [chainLength, setChainLength] = useState(3);
  const [questionCount, setQuestionCount] = useState(5);
  
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  
  // Hangi toolCall'ların seçildiğini tutmak için index listesi
  const [selectedToolCalls, setSelectedToolCalls] = useState([]);

  // Kapatıldığında stateleri sıfırla
  const handleClose = () => {
    if (isLoading) return;
    setStep(1);
    setPrompt('');
    setAiResponse(null);
    setSelectedToolCalls([]);
    onClose();
  };

  const handleGeneratePlan = async () => {
    if (!prompt.trim()) {
      toast.error('Lütfen bir komut giriniz.');
      return;
    }

    setIsLoading(true);
    try {
      // Prompt'a kullanıcı tercihlerini ekleyelim (gizli veya açık olarak)
      const fullPrompt = `${prompt}\n(Ek kısıtlamalar: Zincir uzunluğu en fazla ${chainLength} olmalı. Her adımda yaklaşık ${questionCount} soru/hedef bulunmalı.)`;
      
      const response = await generatePlan(workspaceId, fullPrompt);
      setAiResponse(response);
      
      // Varsayılan olarak hepsini seçili getir
      if (response && response.toolCalls) {
         setSelectedToolCalls(response.toolCalls.map((_, index) => index));
      }
      setStep(2);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data || 'Plan oluşturulurken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleToolCall = (index) => {
    setSelectedToolCalls((prev) => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const handleExecute = async (executeAll) => {
    if (!executeAll && selectedToolCalls.length === 0) {
      toast.error('Lütfen en az bir işlem seçiniz.');
      return;
    }

    setIsLoading(true);
    try {
      // Eğer executeAll true ise, backend'deki veya plan'daki tüm toolCall'ları çalıştır
      const finalPlan = {
        message: aiResponse.message,
        toolCalls: executeAll 
          ? aiResponse.toolCalls 
          : aiResponse.toolCalls.filter((_, index) => selectedToolCalls.includes(index))
      };

      await executePlan(workspaceId, finalPlan, executeAll, chainLength, questionCount);
      toast.success('Plan başarıyla uygulandı!');
      handleClose();
    } catch (error) {
      console.error(error);
      // Eğer kota hatası (402) vs dönerse ekrana basılır
      toast.error(error.response?.data || 'Plan uygulanırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalFooter = (
    <div className={styles.footerInner}>
      <button className={styles.cancelBtn} onClick={handleClose} disabled={isLoading}>
        İptal
      </button>
      {step === 1 ? (
        <button className={styles.submitBtn} onClick={handleGeneratePlan} disabled={isLoading || !prompt.trim()}>
          Plan Oluştur
        </button>
      ) : (
        <>
          <button className={styles.cancelBtn} style={{marginRight: 'auto', backgroundColor: '#e2e8f0', color: '#0f172a'}} onClick={() => handleExecute(false)} disabled={isLoading || selectedToolCalls.length === 0}>
            Seçilileri Onayla
          </button>
          <button className={styles.submitBtn} onClick={() => handleExecute(true)} disabled={isLoading}>
            Tümünü Onayla
          </button>
        </>
      )}
    </div>
  );

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={step === 1 ? '✨ Akıllı Komut' : '✨ Plan Onayı'}
      preventClose={isLoading}
      footer={modalFooter}
      maxWidth="600px"
    >
      <div className={styles.bodyWrapper}>
        {isLoading && (
          <div className={styles.overlay}>
            <div className={styles.loader} />
            <span>{step === 1 ? 'Yapay Zeka Düşünüyor...' : 'İşlemler Uygulanıyor...'}</span>
          </div>
        )}

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.inputGroup}>
              <label className={styles.label}>Neye ihtiyacın var?</label>
              <div className={styles.promptWrapper}>
                <textarea
                  className={styles.textarea}
                  placeholder="Örn: Hafta sonuna kadar matematik üslü sayılar için bir tekrar zinciri oluştur..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <button className={styles.attachBtn} title="Fotoğraf veya Belge Ekle" onClick={() => toast('Dosya yükleme native sürümde aktifleştirilecektir.')}>
                  📎
                </button>
              </div>
            </div>

            <div className={styles.sliders}>
              <div className={styles.sliderContainer}>
                <div className={styles.sliderHeader}>
                  <span className={styles.sliderLabel}>Zincir Uzunluğu</span>
                  <span className={styles.sliderValue}>{chainLength} Gün</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={chainLength} 
                  onChange={(e) => setChainLength(parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>

              <div className={styles.sliderContainer}>
                <div className={styles.sliderHeader}>
                  <span className={styles.sliderLabel}>Soru / Hedef Sayısı</span>
                  <span className={styles.sliderValue}>{questionCount}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={questionCount} 
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && aiResponse && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className={styles.aiMessage}>
              {aiResponse.message || "İşte senin için hazırladığım plan:"}
            </div>

            <div className={styles.toolCallsList}>
              {aiResponse.toolCalls?.map((call, index) => {
                const tName = call.toolName || call.ToolName;
                const tParams = call.parameters || call.Parameters || {};

                let title = tName === "create_task" ? "Görev Oluştur" 
                          : tName === "create_task_chain" ? "Görev Zinciri Kur"
                          : tName;
                
                let details = tParams.title || tParams.description || tParams.Title || tParams.Description || "Detay yok";

                return (
                  <label key={index} className={styles.toolCallItem}>
                    <input 
                      type="checkbox" 
                      className={styles.checkbox}
                      checked={selectedToolCalls.includes(index)}
                      onChange={() => toggleToolCall(index)}
                    />
                    <div className={styles.toolCallContent}>
                      <div className={styles.toolCallTitle}>{title}</div>
                      <p className={styles.toolCallDetails}>{details}</p>
                      <span className={styles.badge}>{tName}</span>
                    </div>
                  </label>
                );
              })}
              
              {(!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) && (
                <p style={{textAlign: 'center', color: '#64748b'}}>Herhangi bir görev planlanmadı. Sadece mesaj.</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </BaseModal>
  );
};

export default AiCommandModal;
