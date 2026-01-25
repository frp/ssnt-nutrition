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
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  setSystemTime,
} from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppContent from "../components/AppContent";
import { BackendBaseUrl } from "@/BackendUrlContext";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BackendBaseUrl.Provider value="http://test-api">
        {ui}
      </BackendBaseUrl.Provider>
    </QueryClientProvider>,
  );
};

describe("AppContent", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  describe("AppContent component", () => {
    const mockData = {
      protein: 3,
      carbs: 2,
      vegetables: 4,
      fats: 1,
    };

    beforeEach(() => {
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

      await user.click(screen.getByRole("button", { name: "← Back to Recording" }));
      expect(
        screen.getByRole("button", { name: "Edit Goals ⚙" }),
      ).toBeInTheDocument();
    });
  });

  describe("Date Picker", () => {
    const mockGoalsData = {
      protein: 5,
      carbs: 6,
      vegetables: 5,
      fats: 4,
    };

    // Mock data for different dates
    const mockDataByDate: Record<string, any> = {
      "2024-01-14": { protein: 1, carbs: 1, vegetables: 1, fats: 1 },
      "2024-01-15": { protein: 3, carbs: 2, vegetables: 4, fats: 1 },
      "2024-01-16": { protein: 2, carbs: 3, vegetables: 2, fats: 2 },
      "2024-01-17": { protein: 4, carbs: 4, vegetables: 3, fats: 3 },
      "2024-01-18": { protein: 5, carbs: 5, vegetables: 5, fats: 4 },
      "2024-01-31": { protein: 2, carbs: 1, vegetables: 2, fats: 1 },
      "2024-02-01": { protein: 3, carbs: 3, vegetables: 3, fats: 2 },
      "2024-02-28": { protein: 1, carbs: 2, vegetables: 1, fats: 1 },
      "2024-02-29": { protein: 2, carbs: 2, vegetables: 2, fats: 2 },
      "2024-03-01": { protein: 3, carbs: 1, vegetables: 3, fats: 1 },
      "2023-12-31": { protein: 4, carbs: 3, vegetables: 4, fats: 3 },
      "2024-01-01": { protein: 1, carbs: 1, vegetables: 1, fats: 0 },
      "2023-02-28": { protein: 2, carbs: 2, vegetables: 1, fats: 2 },
      "2023-03-01": { protein: 3, carbs: 3, vegetables: 2, fats: 3 },
    };

    const mockFetch = mock();

    beforeEach(() => {
      globalThis.fetch = mockFetch as unknown as typeof fetch;
      mockFetch.mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/portions")) {
          const dateMatch = url.match(/days\/([^/]+)\/portions/);
          const date = dateMatch ? dateMatch[1] : "2024-01-15";
          return Promise.resolve({
            json: () => Promise.resolve(mockDataByDate[date] || {}),
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve(mockGoalsData),
        } as Response);
      });
    });

    afterEach(() => {
      mock.restore();
    });

    it("displays the current date on initial render", async () => {
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });
    });

    it("displays correct data for current date", async () => {
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText(/protein/i)).toBeInTheDocument();
      });

      const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      const filledDots = proteinSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(3);
    });

    it("navigates to previous day and shows correct date", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      const prevButton = screen.getByRole("button", { name: "<" });
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText("2024-01-14")).toBeInTheDocument();
      });
    });

    it("shows correct data when navigating to previous day", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText(/protein/i)).toBeInTheDocument();
      });

      const prevButton = screen.getByRole("button", { name: "<" });
      await user.click(prevButton);

      await waitFor(() => {
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(1);
      });
    });

    it("navigates to next day and shows correct date", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      const nextButton = screen.getByRole("button", { name: ">" });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("2024-01-16")).toBeInTheDocument();
      });
    });

    it("shows correct data when navigating to next day", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText(/protein/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole("button", { name: ">" });
      await user.click(nextButton);

      await waitFor(() => {
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(2);
      });
    });

    it("shows correct data for multiple forward navigations", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      // Navigate to 2024-01-16
      await user.click(screen.getByRole("button", { name: ">" }));
      await waitFor(() => {
        expect(screen.getByText("2024-01-16")).toBeInTheDocument();
      });

      let proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      let filledDots = proteinSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(2);

      // Navigate to 2024-01-17
      await user.click(screen.getByRole("button", { name: ">" }));
      await waitFor(() => {
        expect(screen.getByText("2024-01-17")).toBeInTheDocument();
      });

      proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      filledDots = proteinSection?.querySelectorAll(".dot.filled:not(.excess)");
      expect(filledDots).toHaveLength(4);

      // Navigate to 2024-01-18
      await user.click(screen.getByRole("button", { name: ">" }));
      await waitFor(() => {
        expect(screen.getByText("2024-01-18")).toBeInTheDocument();
      });

      proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      filledDots = proteinSection?.querySelectorAll(".dot.filled:not(.excess)");
      expect(filledDots).toHaveLength(5);
    });

    it("shows correct data for multiple backward navigations", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      const prevButton = screen.getByRole("button", { name: "<" });

      // Navigate to 2024-01-14
      await user.click(prevButton);
      await waitFor(() => {
        expect(screen.getByText("2024-01-14")).toBeInTheDocument();
        const carbsSection = screen.getByText(/carbs/i).closest(".nutrient-row");
        const filledDots = carbsSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(1);
      });
    });

    it("correctly handles month boundaries when navigating backward", async () => {
      const user = userEvent.setup();
      setSystemTime(new Date("2024-02-01T12:00:00Z"));

      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-02-01")).toBeInTheDocument();
      });

      const prevButton = screen.getByRole("button", { name: "<" });
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText("2024-01-31")).toBeInTheDocument();
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(2); // 2024-01-31 has 2 protein
      });
    });

    it("correctly handles month boundaries when navigating forward", async () => {
      const user = userEvent.setup();
      setSystemTime(new Date("2024-01-31T12:00:00Z"));

      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-31")).toBeInTheDocument();
      });

      const nextButton = screen.getByRole("button", { name: ">" });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("2024-02-01")).toBeInTheDocument();
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(3); // 2024-02-01 has 3 protein
      });
    });

    it("correctly handles year boundaries when navigating backward", async () => {
      const user = userEvent.setup();
      setSystemTime(new Date("2024-01-01T12:00:00Z"));

      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-01")).toBeInTheDocument();
      });

      const prevButton = screen.getByRole("button", { name: "<" });
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText("2023-12-31")).toBeInTheDocument();
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(4); // 2023-12-31 has 4 protein
      });
    });

    it("correctly handles year boundaries when navigating forward", async () => {
      const user = userEvent.setup();
      setSystemTime(new Date("2023-12-31T12:00:00Z"));

      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2023-12-31")).toBeInTheDocument();
      });

      const nextButton = screen.getByRole("button", { name: ">" });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("2024-01-01")).toBeInTheDocument();
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(1); // 2024-01-01 has 1 protein
      });
    });

    it("correctly handles leap year (Feb 29) when navigating forward", async () => {
      const user = userEvent.setup();
      setSystemTime(new Date("2024-02-28T12:00:00Z"));

      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-02-28")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: ">" }));

      await waitFor(() => {
        expect(screen.getByText("2024-02-29")).toBeInTheDocument();
      });

      let proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      let filledDots = proteinSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: ">" }));

      await waitFor(() => {
        expect(screen.getByText("2024-03-01")).toBeInTheDocument();
      });

      proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      filledDots = proteinSection?.querySelectorAll(".dot.filled:not(.excess)");
      expect(filledDots).toHaveLength(3);
    });

    it("correctly handles leap year (Feb 29) when navigating backward", async () => {
      const user = userEvent.setup();
      setSystemTime(new Date("2024-03-01T12:00:00Z"));

      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-03-01")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "<" }));

      await waitFor(() => {
        expect(screen.getByText("2024-02-29")).toBeInTheDocument();
      });

      let carbsSection = screen.getByText(/carbs/i).closest(".nutrient-row");
      let filledDots = carbsSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: "<" }));

      await waitFor(() => {
        expect(screen.getByText("2024-02-28")).toBeInTheDocument();
      });

      carbsSection = screen.getByText(/carbs/i).closest(".nutrient-row");
      filledDots = carbsSection?.querySelectorAll(".dot.filled:not(.excess)");
      expect(filledDots).toHaveLength(2);
    });

    it("correctly handles non-leap year February", async () => {
      const user = userEvent.setup();
      setSystemTime(new Date("2023-02-28T12:00:00Z"));

      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2023-02-28")).toBeInTheDocument();
      });

      const nextButton = screen.getByRole("button", { name: ">" });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("2023-03-01")).toBeInTheDocument();
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(
          ".dot.filled:not(.excess)",
        );
        expect(filledDots).toHaveLength(3); // 2023-03-01 has 3 protein
      });
    });

    it("shows different data for different days when navigating back and forth", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      // Navigate forward and check data
      await user.click(screen.getByRole("button", { name: ">" }));
      await waitFor(() => {
        expect(screen.getByText("2024-01-16")).toBeInTheDocument();
      });

      let vegetablesSection = screen.getByText(/vegetables/i).closest(".nutrient-row");
      let filledDots = vegetablesSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: ">" }));
      await waitFor(() => {
        expect(screen.getByText("2024-01-17")).toBeInTheDocument();
      });

      vegetablesSection = screen.getByText(/vegetables/i).closest(".nutrient-row");
      filledDots = vegetablesSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(3);

      // Navigate back and verify data updates
      await user.click(screen.getByRole("button", { name: "<" }));
      await waitFor(() => {
        expect(screen.getByText("2024-01-16")).toBeInTheDocument();
      });

      vegetablesSection = screen.getByText(/vegetables/i).closest(".nutrient-row");
      filledDots = vegetablesSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: "<" }));
      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      vegetablesSection = screen.getByText(/vegetables/i).closest(".nutrient-row");
      filledDots = vegetablesSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(4);
    });

    it("resets date to current date when switching between Portions and Goals views", async () => {
      const user = userEvent.setup();
      renderWithClient(<AppContent />);

      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: ">" }));

      await waitFor(() => {
        expect(screen.getByText("2024-01-16")).toBeInTheDocument();
      });

      // Switch to Goals view
      await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "← Back to Recording" }),
        ).toBeInTheDocument();
      });

      // Date picker should not be visible in Goals view
      expect(screen.queryByText("2024-01-16")).not.toBeInTheDocument();

      // Switch back to Portions view
      await user.click(screen.getByRole("button", { name: "← Back to Recording" }));

      // Date should reset to current date (2024-01-15)
      await waitFor(() => {
        expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      });

      const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      const filledDots = proteinSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(3);
    });
  });

  describe("Goals component", () => {
    const mockGoalsData = {
      protein: 5,
      carbs: 6,
      vegetables: 5,
      fats: 4,
    };

    const mockFetch = mock();

    beforeEach(() => {
      globalThis.fetch = mockFetch as unknown as typeof fetch;
    });

    afterEach(() => {
      mock.restore();
    });

    it("shows loading state while fetching goals", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderWithClient(<AppContent />);
      await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders DotCountInput components with correct goal counts", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockGoalsData),
        } as Response),
      );

      renderWithClient(<AppContent />);
      await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));

      await waitFor(() => {
        expect(screen.getByText(/protein/i)).toBeInTheDocument();
      });

      const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
      const proteinFilledDots = proteinSection?.querySelectorAll(".dot.filled");
      expect(proteinFilledDots).toHaveLength(5);
    });

    it("updates UI with fresh data after increasing goal", async () => {
      const user = userEvent.setup();
      let proteinGoal = 5;

      mockFetch.mockImplementation((url, options?) => {
        if (
          options?.method === "POST" &&
          typeof url === "string" &&
          url.includes("/inc")
        ) {
          proteinGoal++;
          return Promise.resolve({ ok: true } as Response);
        }

        return Promise.resolve({
          json: () =>
            Promise.resolve({ ...mockGoalsData, protein: proteinGoal }),
        } as Response);
      });

      renderWithClient(<AppContent />);
      await user.click(screen.getByRole("button", { name: "Edit Goals ⚙" }));

      await waitFor(() => {
        expect(screen.getByText(/protein/i)).toBeInTheDocument();
      });

      const increaseButtons = screen.getAllByRole("button", { name: "+" });
      await user.click(increaseButtons[0]);

      await waitFor(() => {
        const proteinSection = screen.getByText(/protein/i).closest(".nutrient-row");
        const filledDots = proteinSection?.querySelectorAll(".dot.filled");
        expect(filledDots).toHaveLength(6);
      });
    });
  });
});
