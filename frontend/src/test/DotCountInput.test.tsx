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

import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DotCountInput } from "../components/DotCountInput";

describe("DotCountInput", () => {
  describe("Basic rendering", () => {
    it("renders nutrient name and buttons", () => {
      render(
        <DotCountInput
          name="protein"
          count={3}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      expect(screen.getByText(/protein/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "−" })).toBeInTheDocument();
    });

    it("renders correct number of filled dots", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={5}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const filledDots = container.querySelectorAll(".dot.filled");
      expect(filledDots).toHaveLength(5);
    });

    it("applies nutrient-specific CSS class to dots", () => {
      const { container } = render(
        <DotCountInput
          name="carbs"
          count={2}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const filledDots = container.querySelectorAll(".dot.filled.carbs");
      expect(filledDots).toHaveLength(2);
    });
  });

  describe("Button interactions", () => {
    it("calls onIncrease when + button is clicked", async () => {
      const user = userEvent.setup();
      const mockIncrease = mock();

      render(
        <DotCountInput
          name="protein"
          count={3}
          onIncrease={mockIncrease}
          onDecrease={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "+" }));
      expect(mockIncrease).toHaveBeenCalledTimes(1);
    });

    it("calls onDecrease when - button is clicked", async () => {
      const user = userEvent.setup();
      const mockDecrease = mock();

      render(
        <DotCountInput
          name="protein"
          count={3}
          onIncrease={() => {}}
          onDecrease={mockDecrease}
        />,
      );

      await user.click(screen.getByRole("button", { name: "−" }));
      expect(mockDecrease).toHaveBeenCalledTimes(1);
    });

    it("handles multiple button clicks", async () => {
      const user = userEvent.setup();
      const mockIncrease = mock();

      render(
        <DotCountInput
          name="protein"
          count={3}
          onIncrease={mockIncrease}
          onDecrease={() => {}}
        />,
      );

      const increaseButton = screen.getByRole("button", { name: "+" });
      await user.click(increaseButton);
      await user.click(increaseButton);
      await user.click(increaseButton);

      expect(mockIncrease).toHaveBeenCalledTimes(3);
    });
  });

  describe("Goal tracking", () => {
    it("shows empty dots when count is below goal", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={2}
          goal={5}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const filledDots = container.querySelectorAll(".dot.filled");
      const emptyDots = container.querySelectorAll(".dot:not(.filled)");

      expect(filledDots).toHaveLength(2);
      expect(emptyDots).toHaveLength(3);
    });

    it("shows no empty dots when count meets goal", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={5}
          goal={5}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const emptyDots = container.querySelectorAll(".dot:not(.filled)");
      expect(emptyDots).toHaveLength(0);
    });

    it("marks excess dots when count exceeds goal", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={7}
          goal={5}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const excessDots = container.querySelectorAll(".dot.filled.excess");
      const nonExcessDots = container.querySelectorAll(
        ".dot.filled:not(.excess)",
      );

      expect(excessDots).toHaveLength(2);
      expect(nonExcessDots).toHaveLength(5);
    });

    it("does not show empty dots when no goal is set", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={3}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const emptyDots = container.querySelectorAll(".dot:not(.filled)");
      expect(emptyDots).toHaveLength(0);
    });
  });

  describe("inProgress functionality", () => {
    it("shows additional in-progress dots when inProgress is positive", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={3}
          inProgress={2}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const filledDots = container.querySelectorAll(".dot.filled");
      const inProgressDots = container.querySelectorAll(".dot.in-progress");

      expect(filledDots).toHaveLength(3);
      expect(inProgressDots).toHaveLength(2);
    });

    it("converts filled dots to in-progress when inProgress is negative", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={3}
          inProgress={-1}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const filledDots = container.querySelectorAll(".dot.filled");
      const inProgressDots = container.querySelectorAll(".dot.in-progress");

      expect(filledDots).toHaveLength(2);
      expect(inProgressDots).toHaveLength(1);
    });

    it("marks in-progress dots as excess when exceeding goal", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={4}
          goal={5}
          inProgress={2}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const excessInProgress = container.querySelectorAll(
        ".dot.in-progress.excess",
      );
      expect(excessInProgress).toHaveLength(1);
    });
  });

  describe("Edge cases", () => {
    it("handles zero count, disabling the decrease button", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={0}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const filledDots = container.querySelectorAll(".dot.filled");
      expect(filledDots).toHaveLength(0);
      expect(screen.getByRole("button", { name: "−" })).toBeDisabled();
    });

    it("does not mark dots as excess when goal is 0", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={3}
          goal={0}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const excessDots = container.querySelectorAll(".dot.filled.excess");
      expect(excessDots).toHaveLength(0);
    });

    it("handles large count values", () => {
      const { container } = render(
        <DotCountInput
          name="protein"
          count={50}
          onIncrease={() => {}}
          onDecrease={() => {}}
        />,
      );

      const filledDots = container.querySelectorAll(".dot.filled");
      expect(filledDots).toHaveLength(50);
    });
  });
});
