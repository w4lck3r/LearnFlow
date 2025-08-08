import React, { useState, useEffect } from 'react';
import { BookText, Lightbulb, PlaySquare, HelpCircle, GraduationCap, Github } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// L'URL de base pour notre backend FastAPI
const API_BASE_URL = 'http://127.0.0.1:8000'; // Assurez-vous que cela correspond à l'adresse et au port de votre serveur FastAPI

// Composant principal de l'application
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

  // Fonction pour gérer la soumission du formulaire
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsFetching(true);
    setShowQuiz(false); // Cacher le quiz lorsqu'une nouvelle recherche démarre

    try {
      // Effectuer un appel fetch au backend FastAPI
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
      
      // Mettre à jour toutes les variables d'état avec les données de la réponse du backend
      setExplanation(data.explanation);
      setExamples(data.examples.join('\n\n')); 
      setVideos(data.videos);
      setQuiz(data.quiz);

    } catch (error) {
      console.error('Failed to fetch explanation:', error);
      setExplanation('Désolé, quelque chose s\'est mal passé. Veuillez réessayer.');
    } finally {
      setIsFetching(false);
    }
  };
  
  // Fonction pour basculer la visibilité du quiz
  const handleToggleQuiz = () => {
    setShowQuiz(!showQuiz);
  };
  
  // Fonction pour gérer la sélection des réponses du quiz
  const handleAnswerSelect = (questionIndex, selectedOption) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));
  };

  // Fonction pour soumettre le quiz et vérifier les réponses
  const handleSubmitQuiz = () => {
    const feedback = {};
    quiz.forEach((q, index) => {
      feedback[index] = selectedAnswers[index] === q.correctAnswer;
    });
    setQuizFeedback(feedback);
  };

  // Fonction utilitaire pour convertir les URL YouTube en URL d'intégration
  const getEmbedUrl = (videoUrl) => {
    if (!videoUrl) return '';
    try {
      const url = new URL(videoUrl);
      if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
        const videoId = url.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      // Renvoyer l'URL originale si elle ne peut pas être convertie
      return videoUrl; 
    } catch (e) {
      // L'URL n'était pas valide, retourner l'URL d'origine
      return videoUrl;
    }
  };

  // Effet pour charger MathJax pour le rendu des mathématiques
  useEffect(() => {
    // Vérifier si MathJax est déjà sur la page
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

    // Renvoyer une fonction de nettoyage
    return () => {
      // Vous pouvez ajouter une logique de nettoyage ici si nécessaire, comme la suppression du script
    };
  }, [explanation, examples]); // Réexécuter lorsque l'explication ou les exemples changent pour re-rendre les mathématiques

  // Assainir et rendre le contenu markdown
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
          <p className="text-xl text-gray-600 dark:text-gray-300">Votre assistant d'apprentissage propulsé par l'IA</p>
        </header>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex rounded-full shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-4 md:p-5 text-lg outline-none bg-transparent"
              placeholder="par ex., 'théorème du binôme' ou 'expliquer la photosynthèse'"
            />
            <button
              type="submit"
              disabled={isFetching}
              className="bg-blue-600 text-white font-semibold py-4 px-8 md:px-12 hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {isFetching ? 'En train de réfléchir...' : 'Allez !'}
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
                <BookText className="w-6 h-6" /> Explication
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
              />
            </section>

            <section id="examples" className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Lightbulb className="w-6 h-6" /> Exemples résolus
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(examples) }}
              />
            </section>
            
            <section id="videos" className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <PlaySquare className="w-6 h-6" /> Recommandations de vidéos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videos.map((video, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden shadow-md">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={getEmbedUrl(video.url)}
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
                  {showQuiz ? 'Cacher le Quiz' : 'Démarrer le Quiz'}
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
                          {quizFeedback[qIndex] ? 'Correct!' : `Incorrect. La bonne réponse est : ${q.correctAnswer}`}
                        </p>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleSubmitQuiz}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Soumettre les réponses
                  </button>
                </div>
              )}
            </section>
          </main>
        )}
      </div>

      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; 2025 LearnFlow. Tous droits réservés.</p>
        <p className="flex items-center justify-center gap-1 mt-1">
          Créé avec ❤️ par un modèle de langage. <a href="https://github.com/your-username" target="_blank" rel="noopener noreferrer" className="hover:underline"> <Github className="w-4 h-4 inline" /> </a>
        </p>
      </footer>
    </div>
  );
}
