// Copyright 2026 Roman F
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const TRANSLATIONS = {
  de: {
    translation: {
      "AppContent.backToRecording": "← Zurück zur Aufnahme",
      "AppContent.editGoals": "Ziele bearbeiten ⚙",
      "DotCountInput.protein": "Eiweiß",
      "DotCountInput.carbs": "Kohlenhydrate",
      "DotCountInput.vegetables": "Gemüse",
      "DotCountInput.fats": "Fett",
      "common.loading": "Laden...",
      "common.error": "Fehler beim Laden der Daten",
      "common.backendError":
        "Fehler bei der Kommunikation mit dem Backend. Bitte überprüfen Sie Ihre Internetverbindung.",
      "common.selectDate": "Datum auswählen",
      "Goals.title": "Tagesziele",
    },
  },
  "en-GB": {
    translation: {
      "AppContent.backToRecording": "← Back to Recording",
      "AppContent.editGoals": "Edit Goals ⚙",
      "DotCountInput.protein": "Protein",
      "DotCountInput.carbs": "Carbs",
      "DotCountInput.vegetables": "Vegetables",
      "DotCountInput.fats": "Fats",
      "common.loading": "Loading...",
      "common.error": "Error loading data",
      "common.backendError":
        "Error communicating with the backend. Please check your Internet connection.",
      "common.selectDate": "Select date",
      "Goals.title": "Daily Goals",
    },
  },
  ja: {
    translation: {
      "AppContent.backToRecording": "← 記録に戻る",
      "AppContent.editGoals": "目標を編集 ⚙",
      "DotCountInput.protein": "タンパク",
      "DotCountInput.carbs": "炭水化物",
      "DotCountInput.vegetables": "野菜",
      "DotCountInput.fats": "脂肪",
      "common.loading": "読み込み中...",
      "common.error": "データの読み込み中にエラーが発生しました",
      "common.backendError":
        "バックエンドとの通信中にエラーが発生しました。インターネット接続を確認してください。",
      "common.selectDate": "日付を選択",
      "Goals.title": "毎日の目標",
    },
  },
  uk: {
    translation: {
      "AppContent.backToRecording": "← Назад до запису",
      "AppContent.editGoals": "Редагувати цілі ⚙",
      "DotCountInput.protein": "Білки",
      "DotCountInput.carbs": "Вуглеводи",
      "DotCountInput.vegetables": "Овочі",
      "DotCountInput.fats": "Жири",
      "common.loading": "Завантаження...",
      "common.error": "Помилка завантаження даних",
      "common.backendError":
        "Помилка зв'язку з сервером. Будь ласка, перевірте підключення до Інтернету.",
      "common.selectDate": "Вибрати дату",
      "Goals.title": "Щоденні цілі",
    },
  },
};

// Making it a function is necessary so that it could be called multiple times in tests if needed.
export function setupI18n() {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "en-GB",
      resources: TRANSLATIONS,
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "language",
      },
    });
}
