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

type NutrientProps = {
  name: string;
  count: number;
  inProgress?: number;
  goal?: number;
  onIncrease: () => void;
  onDecrease: () => void;
};

/**
 * Component that displays a count as a series of dots.
 *
 * The `inProgress` prop allows for optimistic UI updates:
 * - A positive value adds "in-progress" dots (representing a pending increase).
 * - A negative value visually converts filled dots to "in-progress" dots (representing a pending decrease).
 */
export function DotCountInput({
  count,
  inProgress,
  name,
  onIncrease,
  onDecrease,
  goal,
}: NutrientProps) {
  const numInProgress = inProgress ?? 0;
  const filledDots = numInProgress < 0 ? count + numInProgress : count;
  const inProgressDots = Math.abs(numInProgress);
  return (
    <div className="nutrient-row">
      <div className="nutrient-label">{name}</div>
      <div className="controls">
        <div className="dots-container">
          {new Array(filledDots).fill(filledDots).map((_, i) => (
            <span
              className={`dot filled ${name} ${goal && i >= goal ? "excess" : ""}`}
              // biome-ignore lint/suspicious/noArrayIndexKey: nothing wrong with index here, and there's no more "natural" id
              key={i}
            ></span>
          ))}
          {numInProgress
            ? new Array(inProgressDots)
                .fill(inProgressDots)
                .map((_, i) => (
                  <span
                    className={`dot in-progress ${name} ${goal && filledDots + i >= goal ? "excess" : ""}`}
                    key={i + filledDots}
                  ></span>
                ))
            : []}
          {goal && filledDots + inProgressDots < goal
            ? new Array(goal - filledDots - inProgressDots)
                .fill(goal - filledDots - inProgressDots)
                .map((_, i) => (
                  <span
                    className={`dot ${name}`}
                    key={i + filledDots + inProgressDots}
                  ></span>
                ))
            : []}
        </div>
        <button
          type="button"
          className="action-btn"
          onClick={onDecrease}
          disabled={count + numInProgress === 0}
        >
          −
        </button>
        <button type="button" className="action-btn" onClick={onIncrease}>
          +
        </button>
      </div>
    </div>
  );
}
