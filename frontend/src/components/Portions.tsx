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

import { useQuery } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackendBaseUrl } from "@/BackendUrlContext";
import {
  NUTRIENTS,
  PortionsOfNutrients,
  useNutrientCounterMutation,
} from "@/common";
import { DotCountInput } from "./DotCountInput";

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
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(new Date());
  const baseUrl = useContext(BackendBaseUrl);

  const isoDate = date.toISOString().split("T")[0];
  const dateStrRaw = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "full",
  }).format(date);
  // Capitalization for Ukrainian, as it's capitalized already in other languages.
  const dateStr = dateStrRaw.charAt(0).toUpperCase() + dateStrRaw.slice(1);

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

  const [mutationsInProgress, mutation] = useNutrientCounterMutation(
    `${baseUrl}/days/${isoDate}/portions`,
    "consume",
    ["portions", isoDate],
  );

  if (portionsQuery.isPending || goalsQuery.isPending) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  if (portionsQuery.isError || goalsQuery.isError) {
    return <div className="error">{t("common.error")}</div>;
  }

  if (portionsQuery.data) {
    return (
      <>
        <div className="header-nav">
          <button
            className="nav-button"
            onClick={() => setDate((d) => dayBefore(d))}
            type="button"
          >
            {"<"}
          </button>
          <span>{dateStr}</span>
          <button
            className="nav-button"
            onClick={() => setDate((d) => dayAfter(d))}
            type="button"
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

  return undefined;
}
