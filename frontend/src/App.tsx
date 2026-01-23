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
import "./App.css";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL ?? "api";

const queryClient = new QueryClient();

const NUTRIENTS = ["protein", "carbs", "vegetables", "fats"];

type NutrientProps = {
  name: string;
  count: number;
  goal?: number;
  onIncrease: () => void;
  onDecrease: () => void;
};

function DotCountInput({
  count,
  name,
  onIncrease,
  onDecrease,
  goal,
}: NutrientProps) {
  return (
    <p>
      <button onClick={onDecrease}>-</button>
      {name}:{" "}
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
      <button onClick={onIncrease}>+</button>
    </p>
  );
}

function Portions() {
  const date = new Date().toISOString().split("T")[0];
  const queryClient = useQueryClient();

  const portionsQuery = useQuery({
    queryKey: ["portions"],
    queryFn: () =>
      fetch(`${baseUrl}/days/${date}/portions`).then((res) => res.json()),
  });

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: () => fetch(`${baseUrl}/goals`).then((res) => res.json()),
  });

  const mutation = useMutation({
    mutationFn: ({
      date,
      name,
      command,
    }: {
      date: string;
      name: string;
      command: string;
    }) =>
      fetch(`${baseUrl}/days/${date}/portions/${name}/${command}`, {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (portionsQuery.isPending || goalsQuery.isPending) {
    return <>Pending...</>;
  }

  if (portionsQuery.isError || goalsQuery.isError) {
    return <>Error!</>;
  }

  if (portionsQuery.data) {
    return NUTRIENTS.map((n) => (
      <DotCountInput
        name={n}
        count={portionsQuery.data[n] ?? 0}
        goal={goalsQuery.data[n] ?? 0}
        onIncrease={() =>
          mutation.mutate({ date, name: n, command: "consume" })
        }
        onDecrease={() =>
          mutation.mutate({ date, name: n, command: "unconsume" })
        }
      />
    ));
  }

  return <></>;
}

function Goals() {
  const queryClient = useQueryClient();

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
    return <>Pending...</>;
  }

  if (query.isError) {
    return <>Error!</>;
  }

  if (query.data) {
    return NUTRIENTS.map((n) => (
      <DotCountInput
        name={n}
        count={query.data[n] ?? 0}
        onIncrease={() => mutation.mutate({ name: n, command: "inc" })}
        onDecrease={() => mutation.mutate({ name: n, command: "dec" })}
      />
    ));
  }

  return <></>;
}

function App() {
  const [settingGoals, setSettingGoals] = useState(false);

  const content = settingGoals ? (
    <>
      <button onClick={() => setSettingGoals(false)}>Record Portions</button>
      <Goals />
    </>
  ) : (
    <>
      <button onClick={() => setSettingGoals(true)}>Set Goals</button>
      <Portions />
    </>
  );

  return (
    <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
  );
}

export default App;
