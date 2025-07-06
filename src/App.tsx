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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
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
      
      const response = await fetch('/api/search', {
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
    
    // Only search if there's content and user has stopped typing for 1.5 seconds
    if (value.trim() !== '') {
      searchTimeoutRef.current = window.setTimeout(() => {
        handleSearch(value);
      }, 1500);
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

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 transition-colors duration-300" style={{fontFamily: "'Amiri', 'Noto Sans Arabic', serif"}}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-stone-800 dark:text-white mb-3 transition-colors duration-300">
              البحث الدلالي في الأحاديث
            </h1>
            <p className="text-stone-600 dark:text-gray-300 text-lg transition-colors duration-300">
              ابحث في الأحاديث النبوية بالمعنى والسياق
            </p>
            <p className="text-sm text-stone-500 dark:text-gray-400 mt-2 transition-colors duration-300">
              🔍 يتم ترجمة استعلاماتك العربية إلى الإنجليزية تلقائياً
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-stone-400 dark:text-gray-500 w-6 h-6 transition-colors duration-300" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                placeholder="مثال: كيف كان النبي يأكل، أو آداب الطعام، أو صفات المنافق..."
                className="w-full h-16 pr-14 pl-14 rounded-2xl border border-stone-200 dark:border-gray-600 focus:border-stone-300 dark:focus:border-gray-500 focus:outline-none bg-white dark:bg-gray-800 text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 font-medium text-lg transition-all duration-300 focus:shadow-lg focus:shadow-stone-200/50 dark:focus:shadow-gray-900/50"
                disabled={isLoading}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300 transition-colors duration-300"
                  disabled={isLoading}
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          </form>

          {/* Results Count Selector */}
          <div className="flex justify-center mt-6">
            <div className="relative">
              <label className="block text-sm font-medium text-stone-600 dark:text-gray-300 mb-2 text-center transition-colors duration-300">
                عدد النتائج:
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-40 px-4 py-2 text-sm font-medium text-stone-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-600 rounded-lg hover:bg-stone-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-500 transition-all duration-300"
                  disabled={isLoading}
                >
                  <span>{nResults}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-600 rounded-lg shadow-lg transition-all duration-300">
                    {/* Quick options */}
                    <div className="grid grid-cols-4 gap-1 p-2">
                      {resultOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleNResultsChange(option)}
                          className={`px-3 py-2 text-sm rounded-md transition-colors duration-200 ${
                            nResults === option 
                              ? 'bg-stone-100 dark:bg-gray-700 text-stone-900 dark:text-white font-medium' 
                              : 'text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom input */}
                    <div className="border-t border-stone-100 dark:border-gray-700 p-2">
                      <div className="text-xs text-stone-500 dark:text-gray-400 mb-1">أو أدخل رقماً مخصصاً:</div>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="1-100"
                        className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 transition-colors duration-300"
                        onKeyDown={handleCustomNResults}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="text-center mt-6">
              <Loader2 className="w-8 h-8 text-stone-400 dark:text-gray-500 mx-auto animate-spin transition-colors duration-300" />
              <p className="text-stone-500 dark:text-gray-400 mt-2 transition-colors duration-300">جاري البحث...</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center transition-colors duration-300">
              <p className="text-red-600 dark:text-red-400 font-medium transition-colors duration-300">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-8">
          {hasSearched && !isLoading && hadiths.length === 0 && !error && (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-stone-300 dark:text-gray-600 mx-auto mb-4 transition-colors duration-300" />
              <h4 className="text-lg font-medium text-stone-600 dark:text-gray-400 mb-2 transition-colors duration-300">لا توجد نتائج</h4>
              <p className="text-stone-500 dark:text-gray-500 transition-colors duration-300">جرب البحث بمصطلحات أخرى أو بصيغة مختلفة</p>
            </div>
          )}

          {hadiths.length > 0 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <p className="text-stone-600 dark:text-gray-300 transition-colors duration-300">
                  تم العثور على <span className="font-bold text-stone-800 dark:text-white">{hadiths.length}</span> حديث
                  {hadiths.length === 1 ? '' : 'ات'}
                </p>
              </div>
              
              {hadiths.map((hadith, index) => (
                <div
                  key={hadith.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-stone-100 dark:border-gray-700 hover:border-stone-200 dark:hover:border-gray-600 hover:shadow-lg hover:shadow-stone-200/30 dark:hover:shadow-gray-900/50 transition-all duration-300"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-stone-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                      <span className="text-stone-600 dark:text-gray-300 font-bold text-lg transition-colors duration-300">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-6">
                        <div className="text-xs text-stone-400 dark:text-gray-500 mb-2 transition-colors duration-300">رقم الحديث: {hadith.id}</div>
                        <div className="bg-stone-50 dark:bg-gray-700 rounded-xl p-6 mb-4 transition-colors duration-300">
                          <h4 className="text-sm font-medium text-stone-600 dark:text-gray-300 mb-3 transition-colors duration-300">النص العربي:</h4>
                          <p className="text-stone-800 dark:text-white leading-relaxed text-lg font-medium transition-colors duration-300">
                            {hadith.ar}
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 transition-colors duration-300">
                          <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3 transition-colors duration-300">الترجمة الإنجليزية:</h4>
                          <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-base transition-colors duration-300" dir="ltr" style={{textAlign: 'left'}}>
                            {hadith.en}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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