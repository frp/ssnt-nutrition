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

import { useContext, useState } from "react";
import { DotCountInput } from "./DotCountInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackendBaseUrl } from "@/BackendUrlContext";
import Portions from "./Portions";
import { NUTRIENTS } from "@/common";
import { Toaster } from "react-hot-toast";

function Goals() {
  const queryClient = useQueryClient();
  const baseUrl = useContext(BackendBaseUrl);

  const query = useQuery({
    queryKey: ["goals"],
    queryFn: () => fetch(`${baseUrl}/goals`).then((res) => res.json()),
  });

  const mutation = useMutation({
    mutationFn: ({ name, command }: { name: string; command: string }) =>
      fetch(`${baseUrl}/goals/portions/${name}/${command}`, {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (query.isPending) {
    return <div className="loading">Loading...</div>;
  }

  if (query.isError) {
    return <div className="error">Error loading data</div>;
  }

  // The gidden buttons are in place to ensure consistency of height with the Portions view.
  if (query.data) {
    return (
      <>
        <div className="header-nav">
          <button className="nav-button" style={{ visibility: "hidden" }}>
            {"<"}
          </button>
          <span>Daily Goals</span>
          <button className="nav-button" style={{ visibility: "hidden" }}>
            {">"}
          </button>
        </div>
        <div className="nutrients-list">
          {NUTRIENTS.map((n) => (
            <DotCountInput
              name={n}
              key={n}
              count={query.data[n] ?? 0}
              onIncrease={() => mutation.mutate({ name: n, command: "inc" })}
              onDecrease={() => mutation.mutate({ name: n, command: "dec" })}
            />
          ))}
        </div>
      </>
    );
  }

  return <></>;
}

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
