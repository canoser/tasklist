import React from 'react';
import Button from '../Button/Button';
import Card from '../Card/Card';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null });
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          padding: '24px'
        }}>
          <Card padding="xl" style={{ maxWidth: 480, textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-color-main)' }}>
              Sayfa Yüklenirken Bir Hata Oluştu
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-color-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Beklenmeyen bir arayüz hatası meydana geldi. Sayfayı yenileyerek veya önceki sayfaya dönerek devam edebilirsiniz.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Button variant="outline" size="sm" onClick={this.handleGoBack}>
                Önceki Sayfaya Dön
              </Button>
              <Button variant="primary" size="sm" onClick={this.handleReset}>
                Sayfayı Yenile
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
