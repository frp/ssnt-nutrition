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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppContent from "../components/AppContent";
import { setupI18n } from "../i18n";
import { formatDate, renderWithClient } from "./utils";

describe("AppContent", () => {
  const mockData = {
    protein: 3,
    carbs: 2,
    vegetables: 4,
    fats: 1,
  };

  beforeEach(() => {
    mock.clearAllMocks();
    setSystemTime(new Date("2024-01-15T12:00:00Z"));

    const mockFetch = mock(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      } as Response),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    mock.restore();
  });

  it("toggles between Portions and Goals view", async () => {
    const user = userEvent.setup();
    renderWithClient(<AppContent />);

    expect(
      screen.getByRole("button", { name: "Edit Goals ⚙" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));
    expect(
      screen.getByRole("button", { name: "← Back to Recording" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "← Back to Recording" }),
    );
    expect(
      screen.getByRole("button", { name: "Edit Goals ⚙" }),
    ).toBeInTheDocument();
  });

  it("resets date to current date when switching between Portions and Goals views", async () => {
    const user = userEvent.setup();
    renderWithClient(<AppContent />);

    await waitFor(() => {
      expect(screen.getByText(formatDate("2024-01-15"))).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: ">" }));

    await waitFor(() => {
      expect(screen.getByText(formatDate("2024-01-16"))).toBeInTheDocument();
    });

    // Switch to Goals view
    await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "← Back to Recording" }),
      ).toBeInTheDocument();
    });

    // Date picker should not be visible in Goals view
    expect(
      screen.queryByText(formatDate("2024-01-15")),
    ).not.toBeInTheDocument();

    // Switch back to Portions view
    await user.click(
      screen.getByRole("button", { name: "← Back to Recording" }),
    );

    // Date should reset to current date (2024-01-15)
    await waitFor(() => {
      expect(screen.getByText(formatDate("2024-01-15"))).toBeInTheDocument();
    });

    const proteinSection = screen
      .getByText(/protein/i)
      .closest(".nutrient-row");
    const filledDots = proteinSection?.querySelectorAll(
      ".dot.filled:not(.excess)",
    );
    expect(filledDots).toHaveLength(3);
  });

  it("changes language when language is selected", async () => {
    const user = userEvent.setup();
    renderWithClient(<AppContent />);

    // Initially in English
    expect(
      screen.getByRole("button", { name: "Edit Goals ⚙" }),
    ).toBeInTheDocument();

    const languageSelect = screen.getByRole("combobox", { name: "Language" });
    expect(languageSelect).toHaveValue("en-GB");

    // Switch to German
    await user.selectOptions(languageSelect, "de");

    // Check if text changed to German
    expect(
      screen.getByRole("button", { name: "Ziele bearbeiten ⚙" }),
    ).toBeInTheDocument();
    expect(languageSelect).toHaveValue("de");

    // Switch back to English
    await user.selectOptions(languageSelect, "en-GB");

    // Check if text changed back to English
    expect(
      screen.getByRole("button", { name: "Edit Goals ⚙" }),
    ).toBeInTheDocument();
  });

  it("persists language selection", async () => {
    const user = userEvent.setup();
    renderWithClient(<AppContent />);
    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument(),
    );

    const languageSelect = screen.getByRole("combobox", { name: "Language" });
    await user.selectOptions(languageSelect, "de");

    expect(localStorage.getItem("language")).toBe("de");
  });

  it("initializes with persisted language on reload", async () => {
    // Simulate saved language
    localStorage.setItem("language", "de");

    // Simulate reload by re-initializing i18n
    await setupI18n();

    renderWithClient(<AppContent />);
    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument(),
    );

    // Should be in German
    expect(
      screen.getByRole("button", { name: "Ziele bearbeiten ⚙" }),
    ).toBeInTheDocument();

    const languageSelect = screen.getByRole("combobox", { name: "Language" });
    expect(languageSelect).toHaveValue("de");
  });
});
