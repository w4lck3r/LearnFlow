import React from 'react';
import ReactDOM from 'react-dom/client';
import './output.css'; // Import the new output file
import App from './App';

// Create a root element and render the App component into it
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
