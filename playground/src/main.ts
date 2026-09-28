import { mount } from 'driftjs-dom';
import App from './App.drift';
import './style.css';

const root = document.getElementById('app');

if (root) {
  mount(App, root);
}
