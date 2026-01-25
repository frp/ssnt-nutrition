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

import { BackendBaseUrl } from "@/BackendUrlContext";
import { NUTRIENTS } from "@/common";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { DotCountInput } from "./DotCountInput";

function dayBefore(date: string) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function dayAfter(date: string) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function Portions() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const queryClient = useQueryClient();
  const baseUrl = useContext(BackendBaseUrl);

  const portionsQuery = useQuery({
    queryKey: ["portions", date],
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
    return (
      <div>
        <button onClick={() => setDate((d) => dayBefore(d))}>&lt;</button>
        {date}
        <button onClick={() => setDate((d) => dayAfter(d))}>&gt;</button>
        {NUTRIENTS.map((n) => (
          <DotCountInput
            key={n}
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
        ))}
      </div>
    );
  }

  return <></>;
}
