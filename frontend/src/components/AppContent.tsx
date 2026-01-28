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
import Portions from "./Portions";
import { Toaster } from "react-hot-toast";
import Goals from "./Goals";

// Separate from App for testing, so that I could substitute query client
// with one that does not do retries.
function AppContent() {
  const [settingGoals, setSettingGoals] = useState(false);

  return (
    <div className="app-container">
      <Toaster />
      {settingGoals ? (
        <>
          <button
            className="mode-toggle"
            onClick={() => setSettingGoals(false)}
          >
            ← Back to Recording
          </button>
          <Goals />
        </>
      ) : (
        <>
          <button className="mode-toggle" onClick={() => setSettingGoals(true)}>
            Edit Goals ⚙
          </button>
          <Portions />
        </>
      )}
    </div>
  );
}

export default AppContent;
