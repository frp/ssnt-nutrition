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
  goal?: number;
  onIncrease: () => void;
  onDecrease: () => void;
};

export function DotCountInput({
  count,
  name,
  onIncrease,
  onDecrease,
  goal,
}: NutrientProps) {
  return (
    <div className="nutrient-row">
      <div className="nutrient-label">{name}</div>
      <div className="controls">
        <div className="dots-container">
          {new Array(count).fill(count).map((_, i) => (
            <span
              className={`dot filled ${name} ${goal && i >= goal ? "excess" : ""}`}
              key={i}
            ></span>
          ))}
          {goal && count < goal
            ? new Array(goal - count)
                .fill(goal - count)
                .map((_, i) => (
                  <span className={`dot ${name}`} key={count + i}></span>
                ))
            : []}
        </div>
        <button className="action-btn" onClick={onDecrease}>−</button>
        <button className="action-btn" onClick={onIncrease}>+</button>
      </div>
    </div>
  );
}