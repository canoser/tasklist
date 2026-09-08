import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PaymentsPanel.module.css';
import { getMyPayments, createPayment } from '../../services/coachingApi';

export default function PaymentsPanel({ tone }) {
  const { t } = useTranslation('coaching');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Yeni ödeme kaydı formu
  const [newPayment, setNewPayment] = useState({
    studentProfileId: '',
    amount: '',
    currency: 'TRY',
    paymentDate: new Date().toISOString().split('T')[0],
    description: '',
    status: 'Pending'
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await getMyPayments();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewPayment({ ...newPayment, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        studentProfileId: parseInt(newPayment.studentProfileId) || null,
        amount: parseFloat(newPayment.amount),
        currency: newPayment.currency,
        paymentDate: new Date(newPayment.paymentDate).toISOString(),
        description: newPayment.description,
        status: newPayment.status
      };
      
      const savedPayment = await createPayment(payload);
      setPayments([savedPayment, ...payments]);
      setNewPayment({
        ...newPayment,
        studentProfileId: '',
        amount: '',
        description: '',
        status: 'Pending'
      });
      alert('Ödeme kaydı oluşturuldu.');
    } catch (error) {
      console.error('Save payment error:', error);
      alert('Kayıt başarısız oldu.');
    }
  };

  if (loading) return <div className={styles.loading}>Ödemeler yükleniyor...</div>;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Ödeme Yönetimi</h3>
      
      <form className={styles.form} onSubmit={handleSave}>
        <h4>Yeni Ödeme Ekle</h4>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Öğrenci ID (Opsiyonel)</label>
            <input type="number" name="studentProfileId" value={newPayment.studentProfileId} onChange={handleInputChange} placeholder="Örn: 1" />
          </div>
          <div className={styles.formGroup}>
            <label>Tutar</label>
            <input type="number" step="0.01" name="amount" value={newPayment.amount} onChange={handleInputChange} required placeholder="0.00" />
          </div>
          <div className={styles.formGroup}>
            <label>Tarih</label>
            <input type="date" name="paymentDate" value={newPayment.paymentDate} onChange={handleInputChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Durum</label>
            <select name="status" value={newPayment.status} onChange={handleInputChange}>
              <option value="Pending">Bekliyor</option>
              <option value="Completed">Tamamlandı</option>
              <option value="Failed">Başarısız</option>
              <option value="Refunded">İade Edildi</option>
            </select>
          </div>
        </div>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup} style={{ flex: '1 1 100%' }}>
            <label>Açıklama</label>
            <input type="text" name="description" value={newPayment.description} onChange={handleInputChange} placeholder="Eylül Ayı Ders Ücreti" />
          </div>
        </div>
        
        <button type="submit" className={styles.submitBtn}>Kaydet</button>
      </form>
      
      <div className={styles.listSection}>
        <h4>Tüm Ödemeler</h4>
        {payments.length === 0 ? (
          <p className={styles.emptyText}>Henüz ödeme kaydı bulunmuyor.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th>Öğrenci ID</th>
                <th>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  <td>{payment.description}</td>
                  <td>{payment.studentProfileId || '-'}</td>
                  <td className={styles.amount}>{payment.amount} {payment.currency}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[payment.status]}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
