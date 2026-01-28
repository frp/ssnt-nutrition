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
import { NUTRIENTS, PortionsOfNutrients } from "@/common";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { DotCountInput } from "./DotCountInput";
import toast from "react-hot-toast";

function dayBefore(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function dayAfter(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export default function Portions() {
  const [date, setDate] = useState(new Date());
  const queryClient = useQueryClient();
  const baseUrl = useContext(BackendBaseUrl);

  const isoDate = date.toISOString().split("T")[0];
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
  }).format(date);

  const portionsQuery = useQuery({
    queryKey: ["portions", isoDate],
    queryFn: () =>
      fetch(`${baseUrl}/days/${isoDate}/portions`)
        .then((res) => res.json())
        .then((data) => PortionsOfNutrients.parse(data)),
  });

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: () =>
      fetch(`${baseUrl}/goals`)
        .then((res) => res.json())
        .then((data) => PortionsOfNutrients.parse(data)),
  });

  // { 'protein': 1 } would mean that pending mutations involve 1 portion of protein
  const [mutationsInProgress, setMutationsInProgress] = useState(
    {} as PortionsOfNutrients,
  );

  type MutationInputs = {
    name: string;
    command: string;
  };

  const mutation = useMutation({
    mutationFn: ({ name, command }: MutationInputs) =>
      fetch(`${baseUrl}/days/${isoDate}/portions/${name}/${command}`, {
        method: "POST",
      }),
    onMutate: ({ name, command }) => {
      setMutationsInProgress((m) => {
        return {
          ...m,
          [name]: (m[name] ?? 0) + (command === "consume" ? 1 : -1),
        };
      });
    },
    onSuccess: (_, { name, command }) => {
      queryClient.setQueryData(
        ["portions", isoDate],
        (data: PortionsOfNutrients) => {
          return {
            ...data,
            [name]: (data[name] ?? 0) + (command === "consume" ? 1 : -1),
          };
        },
      );
      setMutationsInProgress((m) => {
        // To remove from "in progress", add the opposite of the mutation direction.
        return {
          ...m,
          [name]: (m[name] ?? 0) + (command === "consume" ? -1 : 1),
        };
      });
    },
    onError: (error, { name, command }) => {
      toast.error(
        `Error communicating with the backend. Please check your Internet connection.`,
      );
      setMutationsInProgress((m) => {
        // To remove from "in progress", add the opposite of the mutation direction.
        return {
          ...m,
          [name]: (m[name] ?? 0) + (command === "consume" ? -1 : 1),
        };
      });
    },
    // TODO: add idempotence
  });

  if (portionsQuery.isPending || goalsQuery.isPending) {
    return <div className="loading">Loading...</div>;
  }

  if (portionsQuery.isError || goalsQuery.isError) {
    return <div className="error">Error loading data</div>;
  }

  if (portionsQuery.data) {
    return (
      <>
        <div className="header-nav">
          <button
            className="nav-button"
            onClick={() => setDate((d) => dayBefore(d))}
          >
            {"<"}
          </button>
          <span>{dateStr}</span>
          <button
            className="nav-button"
            onClick={() => setDate((d) => dayAfter(d))}
          >
            {">"}
          </button>
        </div>
        <div className="nutrients-list">
          {NUTRIENTS.map((n) => (
            <DotCountInput
              key={n}
              name={n}
              count={portionsQuery.data[n] ?? 0}
              inProgress={mutationsInProgress[n] ?? 0}
              goal={goalsQuery.data[n] ?? 0}
              onIncrease={() =>
                mutation.mutate({ name: n, command: "consume" })
              }
              onDecrease={() =>
                mutation.mutate({ name: n, command: "unconsume" })
              }
            />
          ))}
        </div>
      </>
    );
  }

  return <></>;
}
