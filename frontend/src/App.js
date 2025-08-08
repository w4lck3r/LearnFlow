import React, { useState, useEffect } from 'react';
import { BookText, Lightbulb, PlaySquare, HelpCircle, GraduationCap, Github } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// The base URL for our FastAPI backend
const API_BASE_URL = 'http://127.0.0.1:8000'; // Make sure this matches your FastAPI server's address and port

// Main App component
export default function App() {
  const [query, setQuery] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [examples, setExamples] = useState('');
  const [videos, setVideos] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizFeedback, setQuizFeedback] = useState({});

  // Function to handle the form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsFetching(true);
    setShowQuiz(false); // Hide quiz when a new search starts

    try {
      // Make a fetch call to the FastAPI backend
      // IMPORTANT: Changed the endpoint to '/api/v1/generate' to match the new backend
      const response = await fetch(`${API_BASE_URL}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update all state variables with the data from the single backend response
      setExplanation(data.explanation);
      setExamples(data.examples);
      setVideos(data.videos);
      setQuiz(data.quiz);

    } catch (error) {
      console.error('Failed to fetch explanation:', error);
      setExplanation('Sorry, something went wrong. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };
  
  // Function to toggle quiz visibility
  const handleToggleQuiz = () => {
    setShowQuiz(!showQuiz);
  };
  
  // Function to handle quiz answer selection
  const handleAnswerSelect = (questionIndex, selectedOption) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));
  };

  // Function to submit the quiz and check answers
  const handleSubmitQuiz = () => {
    const feedback = {};
    quiz.forEach((q, index) => {
      feedback[index] = selectedAnswers[index] === q.correctAnswer; // NOTE: Changed 'answer' to 'correctAnswer'
    });
    setQuizFeedback(feedback);
  };

  // Effect to load MathJax for math rendering
  useEffect(() => {
    // Check if MathJax is already on the page
    if (window.MathJax) {
      window.MathJax.typesetPromise();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      script.onload = () => {
        window.MathJax.typesetPromise();
      };
      document.head.appendChild(script);
    }

    // Return a cleanup function
    return () => {
      // You can add cleanup logic here if needed, like removing the script
    };
  }, [explanation, examples]); // Rerun when explanation or examples change to re-render math

  // Sanitize and render markdown content
  const renderMarkdown = (markdown) => {
    const html = marked.parse(markdown);
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-600 dark:text-blue-400 mb-2 flex items-center justify-center gap-2">
            <GraduationCap className="w-10 h-10" />
            LearnFlow
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">Your AI-powered learning assistant</p>
        </header>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex rounded-full shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-4 md:p-5 text-lg outline-none bg-transparent"
              placeholder="e.g., 'Binomial theorem' or 'explain photosynthesis'"
            />
            <button
              type="submit"
              disabled={isFetching}
              className="bg-blue-600 text-white font-semibold py-4 px-8 md:px-12 hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {isFetching ? 'Thinking...' : 'Go!'}
            </button>
          </div>
        </form>
        
        {isFetching && (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {!isFetching && explanation && (
          <main className="space-y-12">
            <section id="explanation" className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <BookText className="w-6 h-6" /> Explanation
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
              />
            </section>

            <section id="examples" className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Lightbulb className="w-6 h-6" /> Solved Examples
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(examples) }}
              />
            </section>
            
            <section id="videos" className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <PlaySquare className="w-6 h-6" /> Video Recommendations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videos.map((video, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden shadow-md">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={video.url}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ))}
              </div>
            </section>

            <section id="quiz" className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <HelpCircle className="w-6 h-6" /> Quiz
                </h2>
                <button
                  onClick={handleToggleQuiz}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {showQuiz ? 'Hide Quiz' : 'Start Quiz'}
                </button>
              </div>
              
              {showQuiz && (
                <div className="space-y-6 mt-4">
                  {quiz.map((q, qIndex) => (
                    <div key={qIndex} className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                      <p className="font-semibold mb-2">{q.question}</p>
                      <ul className="space-y-2">
                        {q.options.map((option, oIndex) => (
                          <li key={oIndex}>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`question-${qIndex}`}
                                value={option}
                                checked={selectedAnswers[qIndex] === option}
                                onChange={() => handleAnswerSelect(qIndex, option)}
                                className="form-radio text-blue-600 dark:text-blue-400"
                              />
                              <span
                                className={`text-gray-800 dark:text-gray-200 ${
                                  quizFeedback[qIndex] !== undefined
                                    ? selectedAnswers[qIndex] === q.correctAnswer
                                      ? 'text-green-600 dark:text-green-400 font-bold'
                                      : selectedAnswers[qIndex] === option
                                        ? 'text-red-600 dark:text-red-400 font-bold'
                                        : ''
                                    : ''
                                }`}
                              >
                                {option}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                      {quizFeedback[qIndex] !== undefined && (
                        <p className={`mt-2 font-semibold ${quizFeedback[qIndex] ? 'text-green-600' : 'text-red-600'}`}>
                          {quizFeedback[qIndex] ? 'Correct!' : `Incorrect. The correct answer is: ${q.correctAnswer}`}
                        </p>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleSubmitQuiz}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Submit Answers
                  </button>
                </div>
              )}
            </section>
          </main>
        )}
      </div>

      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; 2025 LearnFlow. All rights reserved.</p>
        <p className="flex items-center justify-center gap-1 mt-1">
          Made with ❤️ by a Language Model. <a href="https://github.com/w4lck3r" target="_blank" rel="noopener noreferrer" className="hover:underline"> <Github className="w-4 h-4 inline" /> </a>
        </p>
      </footer>
    </div>
  );
}
