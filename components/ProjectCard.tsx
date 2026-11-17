"use client";

import { useRouter } from "next/navigation";
import { Badge, Card, CardTitle, Tag } from "@collabrium/ui";
import { Info, Star } from "@phosphor-icons/react";
import type { ProjectCardData } from "@/lib/types";
import { MediaFrame } from "./MediaFrame";
import styles from "./ProjectCard.module.css";

export function ProjectCard({
  project,
  headingLevel = 3,
}: {
  project: ProjectCardData;
  headingLevel?: 2 | 3 | 4;
}) {
  const router = useRouter();
  const href = `/work/${project.slug}`;
  const clientNames = project.clients.map((c) => c.name).join(", ");
  return (
    // The card's title is a plain link (the design system's), which would reload the
    // whole site. Hand plain clicks to the app router instead, and start loading the
    // page as soon as the pointer or focus arrives, so it opens at once.
    <div
      className={styles.reveal}
      onPointerEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest("a[href]");
        if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.push(href);
      }}
    >
      <Card>
        <div className={styles.media}>
          <MediaFrame media={project.cover} aspect="16:9" mode="thumb" />
          {project.status === "in_progress" && (
            <span className={styles.wip}>
              <Info weight="fill" aria-hidden />
              In progress · subject to change
            </span>
          )}
        </div>
        <CardTitle href={href} headingLevel={headingLevel}>
          {project.title}
        </CardTitle>
        <div className={styles.client}>
          {clientNames}
          {project.year ? ` · ${project.year}` : ""}
        </div>
        <div className={styles.meta}>
          {project.featured && (
            <Badge variant="selected" icon={Star}>
              Featured
            </Badge>
          )}
          {project.categories.map((c) => (
            <Tag key={c.id} variant="neutral">
              {c.name}
            </Tag>
          ))}
        </div>
      </Card>
    </div>
  );
}
