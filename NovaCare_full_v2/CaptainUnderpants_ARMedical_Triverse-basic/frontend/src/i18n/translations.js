// src/i18n/translations.js
// Lightweight, flat translation table — NOT a full i18n framework. Workflow
// content carries its own per-language instruction object (instruction.en/hi/kn)
// straight from the backend; this file only covers UI chrome: buttons, status
// labels, error messages, and the safety-boundary copy that must appear in the
// guided workflow regardless of language.
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' }
];

export const strings = {
  en: {
    start: 'Start Guided Session',
    comingSoon: 'Coming Soon',
    explain: 'Explain',
    retry: 'Try Again',
    exit: 'Exit',
    detecting: 'Looking for your {object}…',
    detected: '{object} detected.',
    guiding: 'Follow the instruction below.',
    verifying: 'Verifying…',
    correct: 'Step verified.',
    incorrect: 'This step needs adjustment.',
    uncertain: "We can't clearly verify this.",
    uncertainHint: 'Move into better view and try again.',
    complete: 'Technique complete.',
    step: 'Step',
    of: 'of',
    simulateCorrect: 'Simulate: Correct',
    simulateIncorrect: 'Simulate: Incorrect',
    simulateUncertain: 'Simulate: Uncertain',
    devModeLabel: 'Dev demo — mock ML',
    disclaimerGeneral: 'NovaCare provides procedural guidance and does not replace professional medical care.',
    disclaimerPrescription: "Use only according to your existing prescription or clinician's instructions.",
    unsupported: "This situation is outside NovaCare's supported guidance. Please consult a qualified healthcare professional.",
    markTaken: 'Mark Taken',
    skip: 'Skip',
    viewSchedule: 'View Schedule',
    upNext: 'Up Next',
    today: 'Today',
    recentActivity: 'Recent Activity'
  },
  hi: {
    start: 'गाइडेड सत्र शुरू करें',
    comingSoon: 'जल्द आ रहा है',
    explain: 'समझाएं',
    retry: 'पुनः प्रयास करें',
    exit: 'बाहर निकलें',
    detecting: 'आपका {object} खोजा जा रहा है…',
    detected: '{object} पहचान लिया गया।',
    guiding: 'नीचे दिए गए निर्देश का पालन करें।',
    verifying: 'सत्यापित किया जा रहा है…',
    correct: 'चरण सत्यापित।',
    incorrect: 'इस चरण में सुधार की आवश्यकता है।',
    uncertain: 'हम इसे स्पष्ट रूप से सत्यापित नहीं कर सकते।',
    uncertainHint: 'बेहतर दृश्य में आएं और पुनः प्रयास करें।',
    complete: 'तकनीक पूर्ण हुई।',
    step: 'चरण',
    of: 'में से',
    simulateCorrect: 'सिमुलेट: सही',
    simulateIncorrect: 'सिमुलेट: गलत',
    simulateUncertain: 'सिमुलेट: अनिश्चित',
    devModeLabel: 'डेव डेमो — मॉक ML',
    disclaimerGeneral: 'NovaCare प्रक्रियात्मक मार्गदर्शन प्रदान करता है और पेशेवर चिकित्सा देखभाल का स्थान नहीं लेता।',
    disclaimerPrescription: 'केवल अपने मौजूदा नुस्खे या चिकित्सक के निर्देशों के अनुसार उपयोग करें।',
    unsupported: 'यह स्थिति NovaCare के समर्थित मार्गदर्शन से बाहर है। कृपया किसी योग्य स्वास्थ्य विशेषज्ञ से परामर्श करें।',
    markTaken: 'लिया गया चिह्नित करें',
    skip: 'छोड़ें',
    viewSchedule: 'समय-सारणी देखें',
    upNext: 'आगे',
    today: 'आज',
    recentActivity: 'हाल की गतिविधि'
  },
  kn: {
    start: 'ಗೈಡೆಡ್ ಸೆಷನ್ ಪ್ರಾರಂಭಿಸಿ',
    comingSoon: 'ಶೀಘ್ರದಲ್ಲಿ ಬರಲಿದೆ',
    explain: 'ವಿವರಿಸಿ',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    exit: 'ನಿರ್ಗಮಿಸಿ',
    detecting: 'ನಿಮ್ಮ {object} ಹುಡುಕಲಾಗುತ್ತಿದೆ…',
    detected: '{object} ಪತ್ತೆಯಾಗಿದೆ.',
    guiding: 'ಕೆಳಗಿನ ಸೂಚನೆಯನ್ನು ಅನುಸರಿಸಿ.',
    verifying: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
    correct: 'ಹಂತ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.',
    incorrect: 'ಈ ಹಂತಕ್ಕೆ ಹೊಂದಾಣಿಕೆ ಅಗತ್ಯವಿದೆ.',
    uncertain: 'ಇದನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ.',
    uncertainHint: 'ಉತ್ತಮ ದೃಶ್ಯಕ್ಕೆ ಬಂದು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    complete: 'ತಂತ್ರ ಪೂರ್ಣಗೊಂಡಿದೆ.',
    step: 'ಹಂತ',
    of: 'ರಲ್ಲಿ',
    simulateCorrect: 'ಸಿಮ್ಯುಲೇಟ್: ಸರಿ',
    simulateIncorrect: 'ಸಿಮ್ಯುಲೇಟ್: ತಪ್ಪು',
    simulateUncertain: 'ಸಿಮ್ಯುಲೇಟ್: ಅನಿಶ್ಚಿತ',
    devModeLabel: 'ಡೆವ್ ಡೆಮೊ — ಮಾಕ್ ML',
    disclaimerGeneral: 'NovaCare ಕಾರ್ಯವಿಧಾನದ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ ಮತ್ತು ವೃತ್ತಿಪರ ವೈದ್ಯಕೀಯ ಆರೈಕೆಯನ್ನು ಬದಲಿಸುವುದಿಲ್ಲ.',
    disclaimerPrescription: 'ನಿಮ್ಮ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಥವಾ ವೈದ್ಯರ ಸೂಚನೆಗಳ ಪ್ರಕಾರ ಮಾತ್ರ ಬಳಸಿ.',
    unsupported: 'ಈ ಸನ್ನಿವೇಶ NovaCare ಬೆಂಬಲಿತ ಮಾರ್ಗದರ್ಶನದ ಹೊರಗಿದೆ. ದಯವಿಟ್ಟು ಅರ್ಹ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    markTaken: 'ತೆಗೆದುಕೊಂಡಿದ್ದನ್ನು ಗುರುತಿಸಿ',
    skip: 'ಬಿಟ್ಟುಬಿಡಿ',
    viewSchedule: 'ವೇಳಾಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ',
    upNext: 'ಮುಂದೆ',
    today: 'ಇಂದು',
    recentActivity: 'ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ'
  }
};

// t('key', lang, { object: 'inhaler' }) -> interpolated string with graceful
// fallback to English, then to the raw key if truly missing.
export const t = (key, lang = 'en', vars = {}) => {
  const table = strings[lang] || strings.en;
  let str = table[key] ?? strings.en[key] ?? key;
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return str;
};
