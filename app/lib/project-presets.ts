// Preset progetti REALI di Aaron, pescati dalla sua dash personale
// (~/progetti/dashboard, SEED_PROJECTS). Servono a popolare in fretta la
// schermata Projects: Aaron sceglie quali aggiungere invece di ribatterli.
// Mappa: type personal -> area 'personale'; clienti -> 'lavoro'; studio ->
// 'studio-gazzignato'. Colore per priorità: alta=red, media=orange, bassa=cyan.

import type { Project } from './projects-store';

export type ProjectPreset = Pick<Project, 'name' | 'area' | 'color' | 'note'>;

export const PROJECT_PRESETS: ProjectPreset[] = [
  // ── Personali ──
  { name: 'Dashboard',          area: 'personale', color: 'red',    note: 'Tool gestione · live' },
  { name: 'Libri',              area: 'personale', color: 'red',    note: 'Editoria AI · live' },
  { name: 'Casa Aaron & Giuli', area: 'personale', color: 'orange', note: 'PWA casa · live' },
  { name: 'Mangir',             area: 'personale', color: 'orange', note: 'App social · in dev' },
  { name: 'MadMaps',            area: 'personale', color: 'cyan',   note: 'Tool viaggio moto' },
  { name: 'Organizza Film',     area: 'personale', color: 'orange', note: 'App catalogo' },
  { name: 'Telebot',            area: 'personale', color: 'cyan',   note: 'Scraper · fermo' },
  { name: '100k Portfolio',     area: 'personale', color: 'cyan',   note: 'Sito portfolio · bloccato' },
  // ── Clienti (lavoro) ──
  { name: 'Pizzeria Vesuvio',        area: 'lavoro', color: 'red',    note: 'Cliente ristorante' },
  { name: 'Grissino',                area: 'lavoro', color: 'orange', note: 'Cliente ristorante' },
  { name: 'Tiffany Lunch & Cocktail',area: 'lavoro', color: 'cyan',   note: 'Cliente bar · bloccato' },
  { name: 'La Grotta Cocktail Bar',  area: 'lavoro', color: 'cyan',   note: 'Cliente bar · bloccato' },
  { name: 'Coffee Bean',             area: 'lavoro', color: 'cyan',   note: 'Cliente bar · bloccato' },
  { name: 'Albergo Casagrande',      area: 'lavoro', color: 'cyan',   note: 'Cliente hotel · bloccato' },
  // ── Studio Gazzignato ──
  { name: 'Sito vetrina Studio Gazzignato', area: 'studio-gazzignato', color: 'orange', note: 'Sito vetrina · live' },
  { name: 'Sito personale Aaron',           area: 'studio-gazzignato', color: 'cyan',   note: 'Sito personale · archiviato' },
];
