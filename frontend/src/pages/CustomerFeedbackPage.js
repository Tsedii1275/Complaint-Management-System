import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BRAND_COLORS } from '../constants/theme';
import ApiService from '../services/api';

function CustomerFeedbackPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [ticketNumber, setTicketNumber] = useState('');
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Language state
  const [language, setLanguage] = useState('english'); // default to english, will load from token validation

  const translations = {
    english: {
      documentTitle: 'Resolution Feedback – Dashen Bank',
      title: 'Resolution Feedback Survey',
      subtitle: 'Help us measure and improve our customer satisfaction by completing this quick survey.',
      ticketNumber: 'TICKET NUMBER',
      validating: 'Securing connection...',
      pleaseWait: 'Verifying unique survey link security token...',
      q1: '1. Are you satisfied with the resolution provided for your complaint? *',
      q1Yes: 'Yes – I\'m satisfied',
      q1No: 'No – Not satisfied',
      q2: '2. How satisfied are you with the overall complaint handling experience?',
      q2Legend1: '1 - Very Dissatisfied',
      q2Legend5: '5 - Very Satisfied',
      q3: '3. How likely are you to recommend Dashen Bank to friends or family based on this experience?',
      q3Legend0: '0 - Not Likely At All',
      q3Legend10: '10 - Extremely Likely',
      q3Why: 'What is the primary reason for your score?',
      q3WhyPlaceholder: 'Please let us know the primary reason...',
      q4: '4. "Dashen Bank made it easy for me to resolve my complaint."',
      q4Legend1: '1 - Strongly Disagree',
      q4Legend7: '7 - Strongly Agree',
      q4Why: 'Please tell us what made the complaint resolution process easy or difficult:',
      q4WhyPlaceholder: 'Please explain the details...',
      q5: '5. Additional Comments or Suggestions',
      q5Placeholder: 'Enter any additional suggestions or general feedback...',
      submitBtn: 'Submit Satisfaction Survey',
      submitting: 'Submitting Survey...',
      mandatoryError: 'Please answer: Are you satisfied with the resolution? (Section 1 is mandatory)',
      expiredTokenError: 'This feedback link has already been submitted or expired.',
      invalidTokenError: 'Invalid feedback token.',
      noTokenError: 'No secure feedback token was provided in the URL. Please verify your feedback link.',
      genericError: 'Failed to submit feedback. Please try again.',
      successTitle: 'Thank You!',
      successDesc: 'Your feedback has been successfully submitted. We appreciate your input and will use it to continuously improve our services.',
      closeBtn: 'Close Window',
    },
    amharic: {
      documentTitle: 'የመፍትሄ እርካታ ዳሰሳ – ዳሽን ባንክ',
      title: 'የመፍትሄ እርካታ ዳሰሳ ጥናት',
      subtitle: 'ይህን አጭር ዳሰሳ በመሙላት የደንበኞቻችንን እርካታ እንድንለካ እና እንድናሻሽል ይርዱን።',
      ticketNumber: 'የቅሬታ ቁጥር',
      validating: 'ግንኙነት እየተረጋገጠ ነው...',
      pleaseWait: 'የእርካታ ዳሰሳ መለያ ቁጥር እየተረጋገጠ ነው...',
      q1: '1. ለቅሬታዎ በተሰጠው መፍትሄ ረክተዋል? *',
      q1Yes: 'አዎ – ረክቻለሁ',
      q1No: 'አይ – አልረካሁም',
      q2: '2. ባጠቃላይ ቅሬታዎን በያዝንበት ሁኔታ ምን ያህል ረክተዋል?',
      q2Legend1: '1 - በጣም አልረካሁም',
      q2Legend5: '5 - በጣም ረክቻለሁ',
      q3: '3. በዚህ ተሞክሮ መሰረት ዳሽን ባንክን ለጓደኞችዎ ወይም ለቤተሰብዎ የመምከር እድልዎ ምን ያህል ነው?',
      q3Legend0: '0 - በፍጹም አልመክርም',
      q3Legend10: '10 - በጣም እመክራለሁ',
      q3Why: 'ለዚህ ውጤት ዋናው ምክንያት ምንድን ነው?',
      q3WhyPlaceholder: 'እባክዎ ምክንያቱን እዚህ ይጻፉ...',
      q4: '4. "ዳሽን ባንክ ቅሬታዬን በቀላሉ ለመፍታት ረድቶኛል።"',
      q4Legend1: '1 - በፍጹም አልስማማም',
      q4Legend7: '7 - ሙሉ በሙሉ እስማማለሁ',
      q4Why: 'እባክዎ የቅሬታ መፍትሄ ሂደቱን ቀላል ወይም ከባድ ያደረገውን ይንገሩን:',
      q4WhyPlaceholder: 'እባክዎ ዝርዝሩን እዚህ ያብራሩ...',
      q5: '5. ተጨማሪ አስተያየት ወይም ጥቆማ ካለዎት',
      q5Placeholder: 'ማንኛውም ተጨማሪ አስተያየት ወይም አጠቃላይ ግብረመልስ እዚህ ያስገቡ...',
      submitBtn: 'የእርካታ ዳሰሳውን አስገባ',
      submitting: 'ዳሰሳው እየገባ ነው...',
      mandatoryError: 'እባክዎ መልስ ይስጡ: በመፍትሄው ረክተዋል? (ክፍል 1 የግድ መሞላት አለበት)',
      expiredTokenError: 'ይህ የእርካታ ዳሰሳ አስቀድሞ ገብቷል ወይም ጊዜው አልፏል።',
      invalidTokenError: 'ልክ ያልሆነ የእርካታ ዳሰሳ ሊንክ።',
      noTokenError: 'በሊንኩ ውስጥ ምንም የእርካታ ዳሰሳ መለያ አልተገኘም። እባክዎ ሊንኩን ያረጋግጡ።',
      genericError: 'ዳሰሳውን ማስገባት አልተቻለም። እባክዎ ድጋሚ ይሞክሩ።',
      successTitle: 'እናመሰግናለን!',
      successDesc: 'የእርስዎ አስተያየት በተሳካ ሁኔታ ገብቷል። ስለሰጡን አስተያየት እናመሰግናለን፣ አገልግሎታችንን ለማሻሻል እንጠቀምበታለን።',
      closeBtn: 'መስኮቱን ዝጋ',
    }
  };

  const getValidationErrorMsg = () => {
    if (!validationError) return '';
    const errStr = String(validationError);
    if (errStr.includes("expired") || errStr.includes("already")) {
      return translations[language].expiredTokenError;
    }
    if (errStr.includes("Invalid")) {
      return translations[language].invalidTokenError;
    }
    if (errStr.includes("No secure")) {
      return translations[language].noTokenError;
    }
    return errStr;
  };

  const getLocalizedSubmitMessage = (msg) => {
    if (!msg) return '';
    const errStr = String(msg);
    if (errStr.includes("returned") || errStr.includes("reopened") || errStr.includes("manager")) {
      return language === 'amharic'
        ? "አስተያየትዎ ደርሶናል። ቅሬታዎ በድጋሚ ተከፍቶ ለሁለተኛ ደረጃ ግምገማ ለቅርንጫፍ/ክፍል ኃላፊ ተላልፏል።"
        : "Thank you for your feedback. Your complaint has been returned to the respective Branch/Department manager for a secondary review.";
    }
    if (errStr.includes("closed") || errStr.includes("successfully closed")) {
      return language === 'amharic'
        ? "እናመሰግናለን! ቅሬታዎ በተሳካ ሁኔታ ተዘግቷል።"
        : "Thank you! Your case has been successfully closed.";
    }
    return errStr;
  };

  // Form states
  const [satisfied, setSatisfied] = useState(null); // true | false
  const [csatScore, setCsatScore] = useState(null); // 1 to 5
  const [npsScore, setNpsScore] = useState(null); // 0 to 10
  const [npsComment, setNpsComment] = useState('');
  const [cesScore, setCesScore] = useState(null); // 1 to 7
  const [cesComment, setCesComment] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [error, setError] = useState('');
  const [hoveredYesNo, setHoveredYesNo] = useState(null);
  const [hoveredCsat, setHoveredCsat] = useState(null);
  const [hoveredCes, setHoveredCes] = useState(null);

  const csatLabels = {
    english: { 1: 'Very Dissatisfied', 2: 'Dissatisfied', 3: 'Neutral', 4: 'Satisfied', 5: 'Very Satisfied' },
    amharic: { 1: 'በጣም አልረካሁም', 2: 'አልረካሁም', 3: 'ገለልተኛ', 4: 'ረክቻለሁ', 5: 'በጣም ረክቻለሁ' },
  };

  const cesLabels = {
    english: { 1: 'Strongly Disagree', 2: 'Disagree', 3: 'Somewhat Disagree', 4: 'Neutral', 5: 'Somewhat Agree', 6: 'Agree', 7: 'Strongly Agree' },
    amharic: { 1: 'በፍጹም አልስማማም', 2: 'አልስማማም', 3: 'በከፊል አልስማማም', 4: 'ገለልተኛ', 5: 'በከፊል እስማማለሁ', 6: 'እስማማለሁ', 7: 'ሙሉ በሙሉ እስማማለሁ' },
  };

  useEffect(() => {
    document.title = translations[language].documentTitle;
  }, [language]);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setValidationError('No secure feedback token was provided in the URL. Please verify your feedback link.');
      setValidating(false);
      return;
    }
    try {
      setValidating(true);
      const res = await ApiService.validateCustomerFeedbackToken(token);
      if (res && res.valid) {
        setTicketNumber(res.ticketNumber);
        if (res.preferredLanguage) {
          setLanguage(res.preferredLanguage.toLowerCase());
        }
      } else {
        setValidationError('Invalid feedback token.');
      }
    } catch (err) {
      setValidationError(err.message || 'The feedback request has expired or is invalid.');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (satisfied === null) {
      setError(translations[language].mandatoryError);
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    const payload = {
      token,
      satisfied,
      csatScore,
      npsScore,
      npsComment: npsScore !== null ? npsComment : '',
      cesScore,
      cesComment: cesScore !== null ? cesComment : '',
      additionalComments
    };

    try {
      const result = await ApiService.submitCustomerFeedback(payload);
      setSubmitMessage(result.message || 'Thank you for your valuable feedback!');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || translations[language].genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#f4f6f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    container: {
      width: '100%',
      maxWidth: '650px',
    },
    card: {
      background: '#ffffff',
      borderRadius: '16px',
      padding: '36px 40px',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.04)',
      border: '1px solid #eef2f5',
    },
    logo: {
      height: '42px',
      width: 'auto',
      display: 'block',
      margin: '0 auto 20px',
    },
    title: {
      color: BRAND_COLORS.primary,
      fontSize: '22px',
      fontWeight: 700,
      margin: '0 0 8px',
      textAlign: 'center',
      letterSpacing: '-0.4px',
    },
    tagline: {
      color: '#6b7280',
      fontSize: '14px',
      textAlign: 'center',
      margin: '0 0 28px',
    },
    ticketBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f3f6',
      borderRadius: '8px',
      padding: '8px 14px',
      marginBottom: '24px',
      width: '100%',
      boxSizing: 'border-box',
    },
    ticketLabel: {
      color: '#6b7280',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      marginRight: '6px',
    },
    ticketValue: {
      color: BRAND_COLORS.primary,
      fontSize: '13px',
      fontWeight: 700,
      fontFamily: 'monospace',
    },
    section: {
      width: '100%',
      marginBottom: '28px',
      paddingBottom: '24px',
      borderBottom: '1px solid #f1f4f8',
    },
    sectionTitle: {
      color: '#1f2937',
      fontSize: '15px',
      fontWeight: 600,
      marginBottom: '16px',
      lineHeight: '1.4',
    },
    yesNoRow: {
      display: 'flex',
      gap: '16px',
      width: '100%',
    },
    yesNoBtn: (isSelected, isYes) => ({
      flex: 1,
      padding: '14px',
      borderRadius: '10px',
      border: `2px solid ${isSelected ? (isYes ? '#10b981' : '#ef4444') : '#e5e7eb'}`,
      background: isSelected
        ? (isYes ? '#ecfdf5' : '#fef2f2')
        : (hoveredYesNo === isYes ? '#f9fafb' : '#ffffff'),
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.15s ease',
      outline: 'none',
      fontSize: '15px',
      fontWeight: 600,
      color: isSelected ? (isYes ? '#047857' : '#b91c1c') : '#4b5563',
    }),
    scaleRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '6px',
      flexWrap: 'wrap',
      marginBottom: '8px',
    },
    scaleBtn: (isSelected, maxScale) => ({
      flex: 1,
      minWidth: maxScale > 5 ? '32px' : '45px',
      height: '42px',
      borderRadius: '8px',
      border: `1.5px solid ${isSelected ? BRAND_COLORS.primary : '#e5e7eb'}`,
      background: isSelected ? BRAND_COLORS.primary : '#ffffff',
      color: isSelected ? '#ffffff' : '#374151',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
    }),
    scaleLabels: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11px',
      color: '#6b7280',
      marginTop: '6px',
      padding: '0 2px',
    },
    textareaLabel: {
      display: 'block',
      fontSize: '13px',
      color: '#4b5563',
      marginBottom: '8px',
      fontWeight: 500,
    },
    textarea: {
      width: '100%',
      minHeight: '80px',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1.5px solid #d1d5db',
      fontSize: '14px',
      color: '#1f2937',
      resize: 'vertical',
      outline: 'none',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      background: '#fcfdfe',
    },
    submitBtn: {
      width: '100%',
      padding: '14px',
      borderRadius: '10px',
      border: 'none',
      background: BRAND_COLORS.primary,
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: 600,
      cursor: isSubmitting ? 'not-allowed' : 'pointer',
      opacity: isSubmitting ? 0.7 : 1,
      boxShadow: `0 4px 12px rgba(10, 37, 64, 0.15)`,
      transition: 'all 0.2s ease',
    },
    errorBox: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '12px 14px',
      color: '#dc2626',
      fontSize: '13px',
      marginBottom: '20px',
      textAlign: 'center',
    },
    successTitle: {
      color: BRAND_COLORS.primary,
      fontSize: '24px',
      fontWeight: 700,
      margin: '20px 0 12px',
      textAlign: 'center',
    },
    successText: {
      color: '#4b5563',
      fontSize: '15px',
      textAlign: 'center',
      lineHeight: '1.6',
      margin: '0 auto 28px',
      maxWidth: '480px',
    },
  };

  if (validating) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ ...styles.card, textAlign: 'center', padding: '60px 40px' }}>
            <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid ' + BRAND_COLORS.primary, borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ color: '#1f2937', fontWeight: 600 }}>{translations[language].validating}</h3>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>{translations[language].pleaseWait}</p>
          </div>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ ...styles.card, textAlign: 'center', padding: '50px 40px' }}>
            <span style={{ fontSize: '50px', display: 'block', marginBottom: '16px' }}>⚠️</span>
            <h3 style={{ color: '#dc2626', fontSize: '18px', fontWeight: 700, margin: '0 0 12px' }}>{language === 'amharic' ? 'የእርካታ ዳሰሳ ጥናት አይገኝም' : 'Survey Request Unavailable'}</h3>
            <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
              {getValidationErrorMsg()}
            </p>
            <p style={{ color: '#8c8c8c', fontSize: '12px' }}>
              {language === 'amharic' ? 'ለደህንነት ሲባል እያንዳንዱ የእርካታ ዳሰሳ ሊንክ ለአንድ ጊዜ ብቻ የሚያገለግል ሲሆን ዳሰሳው እንደተጠናቀቀ ጊዜው ያልፋል።' : 'For security, each feedback link is unique, can only be used once, and expires after completion.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/download.png" alt="Dashen Bank" style={styles.logo} />
          
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>
                {satisfied ? '😊' : '📥'}
              </span>
              <h2 style={styles.successTitle}>
                {satisfied ? translations[language].successTitle : (language === 'amharic' ? 'ግብረ መልስ ደርሶናል' : 'Feedback Received')}
              </h2>
              <p style={styles.successText}>
                {getLocalizedSubmitMessage(submitMessage)}
              </p>
              <div style={{ height: '1px', background: '#e5e7eb', margin: '24px 0' }} />
              <p style={{ color: '#8c8c8c', fontSize: '12px' }}>
                {language === 'amharic' ? 'ለዳሽን ባንክ ጊዜ ሰጥተው ስላካፈሉን እናመሰግናለን።' : 'We appreciate you taking the time to share your experience with Dashen Bank.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={styles.title}>{translations[language].title}</h2>
              <p style={styles.tagline}>
                {translations[language].subtitle}
              </p>

              {ticketNumber && (
                <div style={styles.ticketBadge}>
                  <span style={styles.ticketLabel}>{translations[language].ticketNumber}:</span>
                  <span style={styles.ticketValue}>{ticketNumber}</span>
                </div>
              )}

              {/* Section 1: Satisfaction Yes/No (Mandatory) */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  {translations[language].q1}
                </h3>
                <div style={styles.yesNoRow}>
                  <button
                    type="button"
                    style={styles.yesNoBtn(satisfied === true, true)}
                    onClick={() => {
                      setSatisfied(true);
                      setError('');
                    }}
                    onMouseEnter={() => setHoveredYesNo(true)}
                    onMouseLeave={() => setHoveredYesNo(null)}
                  >
                    <span>😊</span> {translations[language].q1Yes}
                  </button>
                  <button
                    type="button"
                    style={styles.yesNoBtn(satisfied === false, false)}
                    onClick={() => {
                      setSatisfied(false);
                      setError('');
                    }}
                    onMouseEnter={() => setHoveredYesNo(false)}
                    onMouseLeave={() => setHoveredYesNo(null)}
                  >
                    <span>😞</span> {translations[language].q1No}
                  </button>
                </div>
              </div>

              {/* Section 2: CSAT (5-point scale) */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  {translations[language].q2}
                </h3>
                <div style={styles.scaleRow}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      style={styles.scaleBtn(csatScore === score, 5)}
                      onClick={() => setCsatScore(score)}
                      title={csatLabels[language][score]}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div style={styles.scaleLabels}>
                  <span>{translations[language].q2Legend1}</span>
                  <span>{translations[language].q2Legend5}</span>
                </div>
              </div>

              {/* Section 3: NPS (0-10 scale) */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  {translations[language].q3}
                </h3>
                <div style={styles.scaleRow}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      style={styles.scaleBtn(npsScore === score, 11)}
                      onClick={() => setNpsScore(score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div style={styles.scaleLabels}>
                  <span>{translations[language].q3Legend0}</span>
                  <span>{translations[language].q3Legend10}</span>
                </div>

                {/* Section 4: NPS Follow-Up (Conditional) */}
                {npsScore !== null && (
                  <div style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease' }}>
                    <label style={styles.textareaLabel}>
                      {translations[language].q3Why}
                    </label>
                    <textarea
                      style={styles.textarea}
                      value={npsComment}
                      onChange={(e) => setNpsComment(e.target.value)}
                      placeholder={translations[language].q3WhyPlaceholder}
                    />
                  </div>
                )}
              </div>

              {/* Section 5: CES (7-point scale) */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  {translations[language].q4}
                </h3>
                <div style={styles.scaleRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                    <button
                      key={score}
                      type="button"
                      style={styles.scaleBtn(cesScore === score, 7)}
                      onClick={() => setCesScore(score)}
                      title={cesLabels[language][score]}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div style={styles.scaleLabels}>
                  <span>{translations[language].q4Legend1}</span>
                  <span>{translations[language].q4Legend7}</span>
                </div>

                {/* Section 6: CES Follow-Up (Conditional) */}
                {cesScore !== null && (
                  <div style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease' }}>
                    <label style={styles.textareaLabel}>
                      {translations[language].q4Why}
                    </label>
                    <textarea
                      style={styles.textarea}
                      value={cesComment}
                      onChange={(e) => setCesComment(e.target.value)}
                      placeholder={translations[language].q4WhyPlaceholder}
                    />
                  </div>
                )}
              </div>

              {/* Section 7: Open-Ended Feedback */}
              <div style={{ ...styles.section, borderBottom: 'none', marginBottom: '16px', paddingBottom: 0 }}>
                <h3 style={styles.sectionTitle}>
                  {translations[language].q5}
                </h3>
                <textarea
                  style={{ ...styles.textarea, minHeight: '100px', marginBottom: 0 }}
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder={translations[language].q5Placeholder}
                />
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}

              <button
                type="submit"
                style={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? translations[language].submitting : translations[language].submitBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerFeedbackPage;
