/**
 * Custom hook encapsulating all CourseBuilder mutation logic.
 *
 * Provides handler functions for section and lesson CRUD, reordering,
 * duplication, reference link management, and course status changes.
 * Keeps the CourseBuilderPage focused on layout and rendering.
 */
import {
  useSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useReorderSectionsMutation,
  useDuplicateSectionMutation,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useReorderLessonsMutation,
  useDuplicateLessonMutation,
  useAddReferenceLinkMutation,
  useDeleteReferenceLinkMutation,
} from "@/hooks/useSections";
import { useCourseQuery, useUpdateCourseStatusMutation } from "@/hooks/useCourses";
import type { ReorderItem, LessonUpdate, ReferenceLinkCreate } from "@/types/section";
import type { ValidationError } from "@/types/course";

export function useCourseBuilder(courseId: string | undefined) {
  const { data: course, isLoading: courseLoading } = useCourseQuery(courseId);
  const { data: sections, isLoading: sectionsLoading } = useSectionsQuery(courseId);

  const updateStatus = useUpdateCourseStatusMutation();

  const createSection = useCreateSectionMutation(courseId!);
  const updateSection = useUpdateSectionMutation(courseId!);
  const deleteSection = useDeleteSectionMutation(courseId!);
  const reorderSections = useReorderSectionsMutation(courseId!);
  const duplicateSection = useDuplicateSectionMutation(courseId!);

  const createLesson = useCreateLessonMutation(courseId!);
  const updateLesson = useUpdateLessonMutation(courseId!);
  const deleteLesson = useDeleteLessonMutation(courseId!);
  const reorderLessons = useReorderLessonsMutation(courseId!);
  const duplicateLesson = useDuplicateLessonMutation(courseId!);
  const addReferenceLink = useAddReferenceLinkMutation(courseId!);
  const deleteReferenceLink = useDeleteReferenceLinkMutation(courseId!);

  const isLoading = courseLoading || sectionsLoading;

  // ── Section handlers ──────────────────────────────────────

  const handleAddSection = () => {
    const count = sections?.length ?? 0;
    createSection.mutate({ title: `Section ${count + 1}` });
  };

  const handleUpdateSection = (sectionId: string, title: string) => {
    updateSection.mutate({ id: sectionId, data: { title } });
  };

  const handleDeleteSection = (sectionId: string) => {
    deleteSection.mutate(sectionId);
  };

  const handleDuplicateSection = (sectionId: string) => {
    duplicateSection.mutate(sectionId);
  };

  const handleReorderSections = (items: ReorderItem[]) => {
    reorderSections.mutate(items);
  };

  // ── Lesson handlers ───────────────────────────────────────

  const handleAddLesson = (sectionId: string, type: "video" | "note" | "quiz" = "video") => {
    const section = sections?.find((s) => s.id === sectionId);
    const count = section?.lessons.length ?? 0;
    const defaultTitle = type === "quiz" ? `Quiz ${count + 1}` : `Lesson ${count + 1}`;
    createLesson.mutate({
      sectionId,
      data: { title: defaultTitle, lesson_type: type },
    });
  };

  const handleUpdateLesson = (sectionId: string, lessonId: string, title: string) => {
    updateLesson.mutate({ sectionId, lessonId, data: { title } });
  };

  /** Update a lesson by ID, auto-resolving its parent section. */
  const handleUpdateLessonFull = (lessonId: string, data: LessonUpdate) => {
    const section = sections?.find((s) => s.lessons.some((l) => l.id === lessonId));
    if (!section) return;
    updateLesson.mutate({ sectionId: section.id, lessonId, data });
  };

  const handleDeleteLesson = (sectionId: string, lessonId: string) => {
    deleteLesson.mutate({ sectionId, lessonId });
  };

  const handleDuplicateLesson = (sectionId: string, lessonId: string) => {
    duplicateLesson.mutate({ sectionId, lessonId });
  };

  const handleReorderLessons = (sectionId: string, items: ReorderItem[]) => {
    reorderLessons.mutate({ sectionId, items });
  };

  // ── Reference link handlers ───────────────────────────────

  const handleAddReferenceLink = (lessonId: string, data: ReferenceLinkCreate) => {
    const section = sections?.find((s) => s.lessons.some((l) => l.id === lessonId));
    if (!section) return;
    addReferenceLink.mutate({ sectionId: section.id, lessonId, data });
  };

  const handleDeleteReferenceLink = (lessonId: string, linkId: string) => {
    const section = sections?.find((s) => s.lessons.some((l) => l.id === lessonId));
    if (!section) return;
    deleteReferenceLink.mutate({ sectionId: section.id, lessonId, linkId });
  };

  // ── Status handlers ───────────────────────────────────────

  const handleMarkReady = (onValidationErrors: (errors: ValidationError[]) => void) => {
    if (!courseId) return;
    updateStatus.mutate(
      { id: courseId, status: "ready" },
      {
        onSuccess: (data) => {
          if (!data.valid) onValidationErrors(data.errors);
        },
      },
    );
  };

  const handleBackToDraft = () => {
    if (!courseId) return;
    updateStatus.mutate({ id: courseId, status: "draft" });
  };

  // ── Derived data ──────────────────────────────────────────

  const totalLessons = sections?.reduce((sum, s) => sum + s.lessons.length, 0) ?? 0;

  /** Find a lesson by ID across all sections. */
  const findLesson = (lessonId: string) =>
    sections?.flatMap((s) => s.lessons).find((l) => l.id === lessonId) ?? null;

  return {
    course,
    sections,
    isLoading,
    totalLessons,
    updateStatus,
    findLesson,
    handleAddSection,
    handleUpdateSection,
    handleDeleteSection,
    handleDuplicateSection,
    handleReorderSections,
    handleAddLesson,
    handleUpdateLesson,
    handleUpdateLessonFull,
    handleDeleteLesson,
    handleDuplicateLesson,
    handleReorderLessons,
    handleAddReferenceLink,
    handleDeleteReferenceLink,
    handleMarkReady,
    handleBackToDraft,
  };
}
