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
import Portions from "../components/Portions";
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

describe("Portions component", () => {
  const mockPortionsData = {
    protein: 3,
    carbs: 2,
    vegetables: 4,
    fats: 1,
  };

  const mockGoalsData = {
    protein: 5,
    carbs: 6,
    vegetables: 5,
    fats: 4,
  };

  const mockFetch = mock();

  beforeEach(() => {
    mock.clearAllMocks();
    setSystemTime(new Date("2024-01-15T12:00:00Z"));
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    mock.restore();
  });

  it("shows loading state while fetching data", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    renderWithClient(<Portions />);
    expect(screen.getByText("Pending...")).toBeInTheDocument();
  });

  it("shows error state when portions fetch fails", async () => {
    mockFetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/portions")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        json: () => Promise.resolve(mockGoalsData),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText("Error!")).toBeInTheDocument();
    });
  });

  it("shows error state when goals fetch fails", async () => {
    mockFetch.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/goals")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        json: () => Promise.resolve(mockPortionsData),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText("Error!")).toBeInTheDocument();
    });
  });

  it("fetches data with correct date in URL", async () => {
    mockFetch.mockImplementation((url) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? mockPortionsData
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://test-api/days/2024-01-15/portions",
      );
    });
  });

  it("renders DotCountInput components with correct count and goal data", async () => {
    mockFetch.mockImplementation((url) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? mockPortionsData
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText(/protein:/i)).toBeInTheDocument();
    });

    const proteinSection = screen.getByText(/protein:/i).closest("p");
    const proteinFilledDots = proteinSection?.querySelectorAll(
      ".dot.filled:not(.excess)",
    );
    const proteinEmptyDots =
      proteinSection?.querySelectorAll(".dot:not(.filled)");
    expect(proteinFilledDots).toHaveLength(3);
    expect(proteinEmptyDots).toHaveLength(2);

    const carbsSection = screen.getByText(/carbs:/i).closest("p");
    const carbsFilledDots = carbsSection?.querySelectorAll(
      ".dot.filled:not(.excess)",
    );
    const carbsEmptyDots = carbsSection?.querySelectorAll(".dot:not(.filled)");
    expect(carbsFilledDots).toHaveLength(2);
    expect(carbsEmptyDots).toHaveLength(4);
  });

  it("handles missing portion data with default values", async () => {
    const partialPortionsData = { protein: 3 };

    mockFetch.mockImplementation((url) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? partialPortionsData
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText(/protein:/i)).toBeInTheDocument();
    });

    const carbsSection = screen.getByText(/carbs:/i).closest("p");
    const carbsFilledDots = carbsSection?.querySelectorAll(".dot.filled");
    expect(carbsFilledDots).toHaveLength(0);
  });

  it("calls consume API when increase button is clicked", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation((url) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? mockPortionsData
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText(/protein:/i)).toBeInTheDocument();
    });

    const increaseButtons = screen.getAllByRole("button", { name: "+" });
    await user.click(increaseButtons[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://test-api/days/2024-01-15/portions/protein/consume",
        { method: "POST" },
      );
    });
  });

  it("updates UI with fresh data after increasing portion", async () => {
    const user = userEvent.setup();
    let proteinCount = 3;

    mockFetch.mockImplementation((url, options?) => {
      if (
        options?.method === "POST" &&
        typeof url === "string" &&
        url.includes("/consume")
      ) {
        proteinCount++;
        return Promise.resolve({ ok: true } as Response);
      }

      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? { ...mockPortionsData, protein: proteinCount }
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText(/protein:/i)).toBeInTheDocument();
    });

    let proteinSection = screen.getByText(/protein:/i).closest("p");
    let filledDots = proteinSection?.querySelectorAll(
      ".dot.filled:not(.excess)",
    );
    expect(filledDots).toHaveLength(3);

    const increaseButtons = screen.getAllByRole("button", { name: "+" });
    await user.click(increaseButtons[0]);

    await waitFor(() => {
      proteinSection = screen.getByText(/protein:/i).closest("p");
      filledDots = proteinSection?.querySelectorAll(".dot.filled:not(.excess)");
      expect(filledDots).toHaveLength(4);
    });
  });

  it("updates UI with fresh data after decreasing portion", async () => {
    const user = userEvent.setup();
    let proteinCount = 3;

    mockFetch.mockImplementation((url, options?) => {
      if (
        options?.method === "POST" &&
        typeof url === "string" &&
        url.includes("/unconsume")
      ) {
        proteinCount--;
        return Promise.resolve({ ok: true } as Response);
      }

      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? { ...mockPortionsData, protein: proteinCount }
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText(/protein:/i)).toBeInTheDocument();
    });

    const decreaseButtons = screen.getAllByRole("button", { name: "-" });
    await user.click(decreaseButtons[0]);

    await waitFor(() => {
      const proteinSection = screen.getByText(/protein:/i).closest("p");
      const filledDots = proteinSection?.querySelectorAll(
        ".dot.filled:not(.excess)",
      );
      expect(filledDots).toHaveLength(2);
    });
  });

  it("displays the current date on initial render", async () => {
    mockFetch.mockImplementation((url) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? mockPortionsData
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
    });
  });

  it("navigates to previous day when clicking prev button", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation((url) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? mockPortionsData
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
    });

    const prevButton = screen.getByRole("button", { name: "<" });
    await user.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText("2024-01-14")).toBeInTheDocument();
    });
  });

  it("navigates to next day when clicking next button", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation((url) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === "string" && url.includes("/portions")
              ? mockPortionsData
              : mockGoalsData,
          ),
      } as Response);
    });

    renderWithClient(<Portions />);

    await waitFor(() => {
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: ">" });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("2024-01-16")).toBeInTheDocument();
    });
  });
});
