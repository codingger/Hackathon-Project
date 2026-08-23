import { Outlet } from 'react-router';
import Navbar from './components/Navbar';
import './App.css';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}