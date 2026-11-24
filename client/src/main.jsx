import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.jsx';
import { SiteProvider } from './lib/site.jsx';
import PublicApp from './public/PublicApp.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles.css';
import './premium.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <SiteProvider>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/*" element={<PublicApp />} />
          </Routes>
        </SiteProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
