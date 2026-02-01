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

import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Goals from "./Goals";
import Portions from "./Portions";

// Separate from App for testing, so that I could substitute query client
// with one that does not do retries.
const languages = [
  { code: "en-GB", flag: "🇬🇧", label: "English" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
  { code: "uk", flag: "🇺🇦", label: "Українська" },
];

function AppContent() {
  const { t, i18n } = useTranslation();
  const [settingGoals, setSettingGoals] = useState(false);

  return (
    <div className="app-container">
      <Toaster />
      <div className="header-row">
        <button
          type="button"
          className="mode-toggle"
          onClick={() => setSettingGoals(!settingGoals)}
        >
          {settingGoals
            ? t("AppContent.backToRecording")
            : t("AppContent.editGoals")}
        </button>
        <select
          className="language-select"
          value={i18n.resolvedLanguage}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          aria-label="Language"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.label}
            </option>
          ))}
        </select>
      </div>
      {settingGoals ? <Goals /> : <Portions />}
    </div>
  );
}

export default AppContent;
