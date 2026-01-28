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

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Goals from "@/components/Goals";
import { renderWithClient } from "./utils";

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
    mockFetch.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<Goals />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders DotCountInput components with correct goal counts", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockGoalsData),
      } as Response),
    );

    renderWithClient(<Goals />);
    await waitFor(() => {
      expect(screen.getByText(/protein/i)).toBeInTheDocument();
    });

    const proteinSection = screen
      .getByText(/protein/i)
      .closest(".nutrient-row");
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
        json: () => Promise.resolve({ ...mockGoalsData, protein: proteinGoal }),
      } as Response);
    });

    renderWithClient(<Goals />);
    await waitFor(() => {
      expect(screen.getByText(/protein/i)).toBeInTheDocument();
    });

    const increaseButtons = screen.getAllByRole("button", { name: "+" });
    await user.click(increaseButtons[0]);

    await waitFor(() => {
      const proteinSection = screen
        .getByText(/protein/i)
        .closest(".nutrient-row");
      const filledDots = proteinSection?.querySelectorAll(".dot.filled");
      expect(filledDots).toHaveLength(6);
    });
  });

  it("shows in-progress dots while updating goal", async () => {
    const user = userEvent.setup();
    // Create a promise that we can resolve manually to control the mutation timing
    let resolveMutation: (value: Response) => void;
    const mutationPromise = new Promise<Response>((resolve) => {
      resolveMutation = resolve;
    });

    mockFetch.mockImplementation((url, options?) => {
      if (
        options?.method === "POST" &&
        typeof url === "string" &&
        url.includes("/inc")
      ) {
        return mutationPromise;
      }

      return Promise.resolve({
        json: () => Promise.resolve(mockGoalsData),
      } as Response);
    });

    renderWithClient(<Goals />);
    await waitFor(() => {
      expect(screen.getByText(/protein/i)).toBeInTheDocument();
    });

    const increaseButtons = screen.getAllByRole("button", { name: "+" });
    await user.click(increaseButtons[0]);

    // During the mutation, we should see an in-progress dot
    const proteinSection = screen
      .getByText(/protein/i)
      .closest(".nutrient-row");

    expect(proteinSection?.querySelectorAll(".dot.in-progress")).toHaveLength(
      1,
    );

    // Resolve the mutation to finish the test cleanly
    resolveMutation!({ ok: true } as Response);

    // After resolution, in-progress dot should disappear
    await waitFor(() => {
      expect(proteinSection?.querySelectorAll(".dot.in-progress")).toHaveLength(
        0,
      );
    });
  });
});
