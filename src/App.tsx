import React, { useState, useRef, useEffect } from 'react';
import { Search, X, BookOpen, Loader2, ChevronDown, Sun, Moon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface Hadith {
  id: string;
  en: string;
  ar: string;
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [nResults, setNResults] = useState(10);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false); // New reading mode state
  const searchTimeoutRef = useRef<number | null>(null);

  const resultOptions = [2, 5, 10, 15, 20, 25, 30, 50];

  // Initialize Gemini AI
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_KEY
  });

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('hadith-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    // Initialize reading mode from localStorage
    const savedReadingMode = localStorage.getItem('hadith-reading-mode');
    if (savedReadingMode === 'true') {
      setIsReadingMode(true);
    }
  }, []);

  // Update theme when isDarkMode changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('hadith-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('hadith-theme', 'light');
    }
  }, [isDarkMode]);

  // Update reading mode in localStorage
  useEffect(() => {
    localStorage.setItem('hadith-reading-mode', isReadingMode.toString());
  }, [isReadingMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleReadingMode = () => {
    setIsReadingMode(!isReadingMode);
  };

  // Function to translate Arabic to English using Gemini
  const translateToEnglish = async (arabicText: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Translate the following Arabic text to English. Only return the English translation, nothing else: "${arabicText}"`,
        config: {
          temperature: 0.1,
          thinkingConfig: {
            thinkingBudget: 0, // Disables thinking for faster response
          },
        },
      });
      
      const translatedText = response.text?.trim() || arabicText;
      console.log('🔍 Original Arabic Query:', arabicText);
      console.log('🌐 Translated English Query:', translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback to original text if translation fails
      return arabicText;
    }
  };

  const handleSearch = async (term: string) => {
    if (term.trim() === '') {
      setHadiths([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Translate Arabic query to English
      const translatedQuery = await translateToEnglish(term);
      
      const response = await fetch(
        import.meta.env.DEV 
          ? 'http://4.233.140.150:3002/api/search'
          : '/api/search', 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queryText: translatedQuery, // Use translated query
            nResults: nResults
          }),
        });

      if (!response.ok) {
        throw new Error('فشل في البحث. تأكد من تشغيل الخادم.');
      }

      const data = await response.json();
      setHadiths(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء البحث');
      setHadiths([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Only search if there's content and user has stopped typing for 2 seconds (increased for better UX)
    if (value.trim() !== '') {
      searchTimeoutRef.current = window.setTimeout(() => {
        handleSearch(value);
      }, 2000);
    } else {
      setHadiths([]);
      setHasSearched(false);
      setError(null);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setHadiths([]);
    setError(null);
    setHasSearched(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    handleSearch(searchTerm);
  };

  const handleNResultsChange = (value: number) => {
    setNResults(value);
    setIsDropdownOpen(false);
    if (searchTerm.trim() !== '') {
      handleSearch(searchTerm);
    }
  };

  const handleCustomNResults = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = parseInt(e.currentTarget.value);
      if (value >= 1 && value <= 100) {
        setNResults(value);
        setIsDropdownOpen(false);
        if (searchTerm.trim() !== '') {
          handleSearch(searchTerm);
        }
      }
    }
  };

  // Soft Arabic color palette
  const colors = {
    light: {
      primary: '#8b5a3c',      // Warm brown
      secondary: '#a67c52',    // Light brown
      background: '#f5f1e6',   // Creamy parchment
      card: '#fdfaf3',         // Off-white
      text: '#2d2d2d',         // Soft black
      accent: '#d8ac9c',       // Terracotta
      border: '#d4c8b0'        // Light beige
    },
    dark: {
      primary: '#d4a574',      // Warm beige
      secondary: '#b8a99a',    // Muted beige
      background: '#1e1e1e',   // Deep dark
      card: '#2d2d2d',         // Dark card
      text: '#eae7d9',         // Creamy text
      accent: '#c99789',       // Muted terracotta
      border: '#444444'        // Dark border
    },
    reading: {
      light: {
        primary: '#8b5a3c',    // Warm brown
        secondary: '#a67c52',  // Light brown
        background: '#f9f5eb', // Light parchment
        text: '#2d2d2d',
        card: '#ffffff',
        accent: '#d8ac9c',     // Terracotta
        border: '#e4dccf'
      },
      dark: {
        primary: '#d4a574',    // Warm beige
        secondary: '#b8a99a',  // Muted beige
        background: '#1e1e1e',
        text: '#f0f0f0',
        card: '#2d2d2d',
        accent: '#c99789',     // Muted terracotta
        border: '#444444'
      }
    }
  };

  // Determine current colors based on mode
  const currentColors = isReadingMode 
    ? (isDarkMode ? colors.reading.dark : colors.reading.light)
    : (isDarkMode ? colors.dark : colors.light);

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: currentColors.background,
        fontFamily: "'Amiri', 'Noto Sans Arabic', serif",
        color: currentColors.text
      }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border transition-all duration-300 shadow-sm hover:shadow-md"
              style={{
                backgroundColor: currentColors.card,
                borderColor: currentColors.border
              }}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: currentColors.accent }} />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: currentColors.accent }} />
              )}
            </button>
            
            <button
              onClick={toggleReadingMode}
              className="p-2 rounded-full border transition-all duration-300 shadow-sm hover:shadow-md"
              style={{
                backgroundColor: currentColors.card,
                borderColor: currentColors.border,
                color: isReadingMode ? currentColors.primary : currentColors.text
              }}
              aria-label={isReadingMode ? 'Exit reading mode' : 'Enter reading mode'}
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center mb-4 sm:mb-6">
            <h1 
              className="text-xl sm:text-3xl font-bold mb-2 sm:mb-3 transition-colors duration-300"
              style={{ color: currentColors.primary }}
            >
              البحث الدلالي في الأحاديث
            </h1>
            <p 
              className="text-xs sm:text-base transition-colors duration-300"
              style={{ color: currentColors.secondary }}
            >
              ابحث في الأحاديث النبوية بالمعنى والسياق
            </p>
            <p 
              className="text-xs sm:text-sm mt-2 transition-colors duration-300"
              style={{ color: currentColors.secondary }}
            >
              🔍 يتم ترجمة استعلاماتك العربية إلى الإنجليزية تلقائياً
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
            <div className="relative flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300" 
                  style={{ color: currentColors.secondary }}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleInputChange}
                  placeholder="مثال: كيف كان النبي يأكل، أو آداب الطعام..."
                  className="w-full h-10 sm:h-12 pr-10 sm:pr-12 pl-3 sm:pl-14 rounded-lg sm:rounded-xl border focus:outline-none font-medium text-sm sm:text-base transition-all duration-300"
                  style={{
                    backgroundColor: currentColors.card,
                    borderColor: currentColors.border,
                    color: currentColors.text
                  }}
                  disabled={isLoading}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300"
                    style={{ color: currentColors.secondary }}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || searchTerm.trim() === ''}
                className="h-10 sm:h-12 px-4 sm:px-5 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: currentColors.primary,
                  color: '#f5f1e6',
                  opacity: (isLoading || searchTerm.trim() === '') ? 0.7 : 1
                }}
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>بحث</span>
              </button>
            </div>
          </form>

          {/* Results Count Selector */}
          <div className="flex justify-center mt-4 sm:mt-6">
            <div className="relative">
              <label 
                className="block text-xs sm:text-sm font-medium mb-2 text-center transition-colors duration-300"
                style={{ color: currentColors.text }}
              >
                عدد النتائج:
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-32 sm:w-40 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-300 border rounded-lg focus:outline-none"
                  style={{
                    backgroundColor: currentColors.card,
                    borderColor: currentColors.border,
                    color: currentColors.text
                  }}
                  disabled={isLoading}
                >
                  <span>{nResults}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div 
                    className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg transition-all duration-300"
                    style={{
                      backgroundColor: currentColors.card,
                      borderColor: currentColors.border
                    }}
                  >
                    {/* Quick options */}
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {resultOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleNResultsChange(option)}
                          className={`px-2 py-1.5 text-xs sm:text-sm rounded-md transition-colors duration-200 ${
                            nResults === option 
                              ? 'font-medium' 
                              : 'hover:opacity-90'
                          }`}
                          style={{
                            backgroundColor: nResults === option ? currentColors.primary : 'transparent',
                            color: nResults === option ? '#f5f1e6' : currentColors.text
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom input */}
                    <div 
                      className="border-t p-2"
                      style={{ borderColor: currentColors.border }}
                    >
                      <div 
                        className="text-xs mb-1"
                        style={{ color: currentColors.secondary }}
                      >
                        أو أدخل رقماً مخصصاً:
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="1-100"
                        className="w-full px-2 py-1.5 text-xs sm:text-sm border rounded-md focus:outline-none transition-colors duration-300"
                        style={{
                          backgroundColor: currentColors.card,
                          borderColor: currentColors.border,
                          color: currentColors.text
                        }}
                        onKeyDown={handleCustomNResults}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="text-center mt-4">
              <Loader2 
                className="w-5 h-5 sm:w-6 sm:h-6 mx-auto animate-spin transition-colors duration-300" 
                style={{ color: currentColors.secondary }}
              />
              <p 
                className="text-xs sm:text-sm mt-2 transition-colors duration-300"
                style={{ color: currentColors.secondary }}
              >
                جاري البحث...
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-4 sm:mb-6">
            <div 
              className="rounded-lg sm:rounded-xl p-3 sm:p-4 text-center transition-colors duration-300"
              style={{
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                color: isDarkMode ? '#fecaca' : '#dc2626'
              }}
            >
              <p className="text-xs sm:text-sm font-medium transition-colors duration-300">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-3 sm:space-y-6">
          {hasSearched && !isLoading && hadiths.length === 0 && !error && (
            <div className="text-center py-8 sm:py-12">
              <BookOpen 
                className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 transition-colors duration-300" 
                style={{ color: currentColors.secondary }}
              />
              <h4 
                className="text-sm sm:text-base font-medium mb-1 sm:mb-2 transition-colors duration-300"
                style={{ color: currentColors.text }}
              >
                لا توجد نتائج
              </h4>
              <p 
                className="text-xs sm:text-sm transition-colors duration-300"
                style={{ color: currentColors.secondary }}
              >
                جرب البحث بمصطلحات أخرى أو بصيغة مختلفة
              </p>
            </div>
          )}

          {hadiths.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center mb-4 sm:mb-6">
                <p 
                  className="text-xs sm:text-sm transition-colors duration-300"
                  style={{ color: currentColors.secondary }}
                >
                  تم العثور على <span className="font-bold" style={{ color: currentColors.primary }}>{hadiths.length}</span> حديث
                  {hadiths.length === 1 ? '' : 'ات'}
                </p>
              </div>
              
              {hadiths.map((hadith, index) => (
                <div key={hadith.id}>
                  <article
                    className={`rounded-lg transition-all duration-300 p-4 sm:p-6 ${isReadingMode ? 'shadow-none' : 'hover:shadow-sm'}`}
                    style={{
                      backgroundColor: isReadingMode ? 'transparent' : `${currentColors.card}20`,
                      border: isReadingMode ? 'none' : `1px solid ${currentColors.border}30`
                    }}
                  >
                    {/* Enhanced Number */}
                    <div 
                      className="inline-flex items-center justify-center w-3 h-3 sm:w-5 sm:h-5 rounded-full text-xs sm:text-sm font-bold mb-3 sm:mb-4 transition-all duration-300"
                      style={{ 
                        backgroundColor: currentColors.primary,
                        color: '#f5f1e6'
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Arabic Text */}
                    <p 
                      className={`leading-relaxed font-medium text-right ${isReadingMode ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'}`}
                      style={{ 
                        color: currentColors.text,
                        lineHeight: isReadingMode ? '2.2' : '1.8'
                      }}
                    >
                      {hadith.ar}
                    </p>

                    {/* English Translation */}
                    <p 
                      className={`leading-relaxed mt-3 ${isReadingMode ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}
                      dir="ltr" 
                      style={{
                        textAlign: 'left',
                        color: currentColors.text,
                        lineHeight: isReadingMode ? '2.0' : '1.7'
                      }}
                    >
                      {hadith.en}
                    </p>
                  </article>
                  
                  {/* Minimal Separator */}
                  {index < hadiths.length - 1 && (
                    <div 
                      className="my-4 sm:my-6 opacity-20"
                      style={{
                        height: '1px',
                        backgroundColor: currentColors.border
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;