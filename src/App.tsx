import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Welcome from './pages/Welcome';
import Room from './pages/Room';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-blue-500 to-orange-500">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/:roomId" element={<Welcome />} />          
          <Route path="/room/:id" element={<Room />} />
        </Routes>
        <Toaster position="top-center" />
      </div>
    </BrowserRouter>
  );
}

export default App;