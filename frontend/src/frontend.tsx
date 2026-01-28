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

/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { BackendBaseUrl } from "./BackendUrlContext";

const baseUrl = process.env.BUN_PUBLIC_BASE_URL ?? "/api";

// biome-ignore lint/style/noNonNullAssertion: I know it's there
const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BackendBaseUrl.Provider value={baseUrl}>
      <App />
    </BackendBaseUrl.Provider>
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  import.meta.hot.data.root ??= createRoot(elem);
  const root = import.meta.hot.data.root;
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
