'use client';

import { useState, useTransition, useRef, useMemo } from 'react';
import { generateBriefAndFindConflicts, SourceMaterial } from '@/app/actions';
import type { GenerateProjectBriefOutput } from '@/ai/flows/generate-project-brief';
import type { DetectConflictingRequirementsOutput } from '@/ai/flows/detect-conflicting-requirements';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { FileText, Plus, Trash2, Loader, Bot, AlertTriangle, FileUp, Download, LogOut, ArrowLeft, Pencil } from 'lucide-react';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useProject } from '@/firebase/firestore/use-project';
import { addDoc, collection, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { AuthForm } from '@/app/auth-form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';


type Conflict = DetectConflictingRequirementsOutput['conflicts'][0];

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { projectId, isLoading: isProjectLoading, createProject, selectProject, resetProject } = useProject(user);

  const [isPending, startTransition] = useTransition();
  // Local state for formatted brief/conflicts purely for display if needed,
  // but we should prefer direct data from firestore
  // However, generateBriefAndFindConflicts returns the object, so we might want to save it to firestore
  // and then read it from firestore.

  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceContent, setNewSourceContent] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [projectToRename, setProjectToRename] = useState<{ id: string, title: string } | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [conflictResolutions, setConflictResolutions] = useState<Record<number, string>>({});

  const { toast } = useToast();
  const textInputRef = useRef<HTMLInputElement>(null);

  // -- Dashboard Data --
  const dashboardProjectsRef = useMemoFirebase(() =>
    user && !projectId ? query(collection(firestore, 'users', user.uid, 'projects'), orderBy('createdAt', 'desc')) : null,
    [user, projectId, firestore]);
  const { data: dashboardProjects } = useCollection<any>(dashboardProjectsRef);

  // -- Workspace Data --
  const projectsRef = useMemoFirebase(() =>
    user && projectId ? collection(firestore, 'users', user.uid, 'projects', projectId, 'documents') : null,
    [user, projectId, firestore]);

  const briefsRef = useMemoFirebase(() =>
    user && projectId ? collection(firestore, 'users', user.uid, 'projects', projectId, 'briefs') : null,
    [user, projectId, firestore]);

  // Fetch current project document to get the title
  const currentProjectRef = useMemoFirebase(() =>
    user && projectId ? doc(firestore, 'users', user.uid, 'projects', projectId) : null,
    [user, projectId, firestore]);
  const { data: currentProject } = useDoc<any>(currentProjectRef);

  const { data: sourcesData } = useCollection<SourceMaterial>(projectsRef);
  const { data: briefsData } = useCollection<any>(briefsRef); // We'll assume one brief for now

  const sources = sourcesData || [];
  // Get the most recent brief if multiple, or just the first
  const currentBriefDoc = briefsData && briefsData.length > 0 ? briefsData[0] : null;
  const brief = currentBriefDoc as (GenerateProjectBriefOutput & { conficts?: Conflict[] }) | null;
  const conflicts = currentBriefDoc?.conflicts as Conflict[] || null;

  const handleCreateProject = async () => {
    await createProject();
  };

  const openRenameDialog = (id: string, currentTitle: string) => {
    setProjectToRename({ id, title: currentTitle });
    setNewProjectTitle(currentTitle);
  };

  const handleRenameProject = async () => {
    if (!projectToRename || !newProjectTitle.trim() || !user) return;

    try {
      const projectDocRef = doc(firestore, 'users', user.uid, 'projects', projectToRename.id);
      await updateDoc(projectDocRef, {
        title: newProjectTitle.trim()
      });
      setProjectToRename(null);
      setNewProjectTitle('');
      toast({
        title: 'Project Renamed',
        description: 'The project title has been updated successfully.'
      });
    } catch (e) {
      console.error("Error renaming project:", e);
      toast({
        title: 'Error',
        description: 'Failed to rename project.',
        variant: 'destructive'
      });
    }
  };

  const handleAddSource = async () => {
    if (newSourceTitle.trim() && newSourceContent.trim() && projectsRef && user) {
      try {
        await addDoc(projectsRef, {
          title: newSourceTitle,
          content: newSourceContent,
          members: { [user.uid]: 'owner' }
        });
        setNewSourceTitle('');
        setNewSourceContent('');
        setShowAddForm(false);
      } catch (e) {
        toast({
          title: 'Error exporting',
          description: 'Failed to save source material.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!projectsRef) return;
    try {
      await deleteDoc(doc(projectsRef, id));
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && projectsRef && user) {
      if (!file.type.startsWith('text/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a plain text file (.txt).',
          variant: 'destructive',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        if (content) {
          try {
            await addDoc(projectsRef, {
              title: file.name,
              content: content,
              members: { [user.uid]: 'owner' }
            });
            toast({
              title: 'File Imported',
              description: `${file.name} has been added as a source.`,
            });
          } catch (err) {
            toast({
              title: 'Import Error',
              description: `Failed to save file content.`,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Import Error',
            description: `Could not read content from ${file.name}.`,
            variant: 'destructive',
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: 'Import Error',
          description: `Error reading file ${file.name}.`,
          variant: 'destructive',
        });
      };
      reader.readAsText(file);
    }
    // Reset file input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePdfSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectsRef || !user) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Show loading toast
      toast({
        title: 'Processing PDF',
        description: 'Extracting text from PDF...',
      });

      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker source - use unpkg CDN which is more reliable
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Extract text from all pages
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      if (fullText.trim()) {
        await addDoc(projectsRef, {
          title: file.name,
          content: fullText.trim(),
          members: { [user.uid]: 'owner' }
        });
        toast({
          title: 'PDF Imported',
          description: `${file.name} has been processed and added.`,
        });
      } else {
        toast({
          title: 'No Text Found',
          description: 'The PDF appears to be empty or contains only images.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error("PDF upload error:", error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Could not extract text from the PDF.',
        variant: 'destructive',
      });
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleGenerate = () => {
    if (sources.length === 0) {
      toast({
        title: 'No sources provided',
        description: 'Please add at least one source material to generate a brief.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const result = await generateBriefAndFindConflicts(sources);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        // Save to Firestore
        if (briefsRef && user) {
          // Check if a brief already exists, if so update it, else create new
          // For simplicity in this prototype, we'll just add a new one or update the first one
          // Ideally we'd have a specific brief ID we are working on.
          if (currentBriefDoc) {
            await updateDoc(doc(briefsRef, currentBriefDoc.id), {
              ...result.brief,
              conflicts: result.conflicts || [],
              // members should already exist
            });
          } else {
            await addDoc(briefsRef, {
              ...result.brief,
              conflicts: result.conflicts || [],
              members: { [user.uid]: 'owner' }
            });
          }
        }
      }
    });
  };

  const getSourceTitle = (id: string) => sources.find(s => s.id === id)?.title || id;

  const renderBriefSection = (title: string, items: { text: string; references: string[] }[]) => {
    if (!items || items.length === 0 || items.every(item => !item.text)) return null;
    return (
      <div className="space-y-3">
        <h3 className="font-headline text-lg font-semibold capitalize">{title.replace(/_/g, ' ')}</h3>
        <ul className="space-y-2 list-disc pl-5 font-body leading-relaxed">
          {items.map((item, index) => (
            <li key={index}>
              <p>{item.text}</p>
              {item.references && item.references.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  References: {item.references.map(refId => getSourceTitle(refId)).join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  };

  if (isUserLoading || isProjectLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // --- Dashboard View ---
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-8 text-primary" />
              <h1 className="font-headline text-2xl font-bold tracking-tight">Project Brief Generator</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut(auth)}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign Out</span>
            </Button>
          </div>
        </header>
        <main className="container mx-auto p-4 md:p-6 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl font-bold">Your Projects</h2>
            <Button onClick={handleCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardProjects?.map(project => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50 group" onClick={() => selectProject(project.id)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="truncate max-w-[150px]">{project.title || 'Untitled Project'}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog(project.id, project.title || 'Untitled Project');
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Created {project.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Click to open this project workspace.</p>
                </CardContent>
              </Card>
            ))}

            {(!dashboardProjects || dashboardProjects.length === 0) && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>No projects yet. Create one to get started!</p>
              </div>
            )}
          </div>

          <Dialog open={!!projectToRename} onOpenChange={(open) => !open && setProjectToRename(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Project</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Project Name"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setProjectToRename(null)}>Cancel</Button>
                <Button onClick={handleRenameProject}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    );
  }

  // --- Workspace View ---
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => resetProject()} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo className="h-8 w-8 text-primary" />
            <div className="flex items-center gap-2 group">
              <h1 className="font-headline text-2xl font-bold tracking-tight hidden md:block">
                {currentProject?.title || 'Untitled Project'}
              </h1>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 transition-opacity" onClick={() => {
                if (projectId && currentProject) {
                  openRenameDialog(projectId, currentProject.title || 'Untitled Project');
                }
              }}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileUp className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => textInputRef.current?.click()}>
                  Import Text File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => pdfInputRef.current?.click()}>
                  Import PDF File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              type="file"
              ref={textInputRef}
              className="hidden"
              accept="text/plain"
              onChange={handleFileSelected}
            />
            <input
              type="file"
              ref={pdfInputRef}
              className="hidden"
              accept="application/pdf"
              onChange={handlePdfSelected}
            />
            <Button variant="default" size="sm" onClick={() => handleGenerate()} disabled={isPending || sources.length === 0}>
              {isPending ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              Generate Brief
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut(auth)}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column: Source Materials */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl font-semibold">Source Materials</h2>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Source
              </Button>
            </div>

            {showAddForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Source</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Source Title (e.g., 'Meeting Notes 2024-05-10')"
                    value={newSourceTitle}
                    onChange={(e) => setNewSourceTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Paste your notes, chat logs, or document snippets here..."
                    value={newSourceContent}
                    onChange={(e) => setNewSourceContent(e.target.value)}
                    rows={5}
                  />
                </CardContent>
                <CardContent className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button onClick={handleAddSource}>Save Source</Button>
                </CardContent>
              </Card>
            )}

            {sources.length === 0 && !showAddForm ? (
              <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No sources yet</h3>
                <p className="text-muted-foreground text-sm">Add your first source material to get started.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {sources.map(source => (
                  <Card key={source.id} className="group transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">{source.title}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" onClick={() => handleDeleteSource(source.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete source</span>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{source.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Generated Brief */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl font-semibold">Project Brief</h2>
              <Button variant="outline" size="sm" onClick={() => {
                if (!brief) return;

                let content = `# Project Brief\n\n`;

                // Helper to format sections
                const formatSection = (title: string, items: { text: string; references: string[] }[]) => {
                  if (!items || items.length === 0) return '';
                  let section = `## ${title.replace(/_/g, ' ')}\n\n`;
                  items.forEach(item => {
                    section += `- ${item.text}\n`;
                    if (item.references && item.references.length > 0) {
                      section += `  - References: ${item.references.map(refId => getSourceTitle(refId)).join(', ')}\n`;
                    }
                  });
                  section += '\n';
                  return section;
                };

                // Type guard or safe access for the brief fields
                content += formatSection('Project Overview', brief.project_overview || []);
                content += formatSection('Goals', brief.goals || []);
                content += formatSection('In Scope', brief.in_scope || []);
                content += formatSection('Out of Scope', brief.out_of_scope || []);
                content += formatSection('Constraints', brief.constraints || []);
                content += formatSection('Assumptions', brief.assumptions || []);
                content += formatSection('Risks', brief.risks || []);
                content += formatSection('Acceptance Criteria', brief.acceptance_criteria || []);
                content += formatSection('Open Questions', brief.open_questions || []);

                if (conflicts && conflicts.length > 0) {
                  content += `## Conflicts\n\n`;
                  conflicts.forEach(conflict => {
                    content += `### Conflict in ${conflict.category}\n`;
                    content += `- Statement A: "${conflict.statement_a}" (Source: ${getSourceTitle(conflict.source_a)})\n`;
                    content += `- Statement B: "${conflict.statement_b}" (Source: ${getSourceTitle(conflict.source_b)})\n\n`;
                  });
                }

                const blob = new Blob([content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'project-brief.md';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }} disabled={!brief}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            <Card className="min-h-[60vh]">
              {isPending ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <br />
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : !brief && !conflicts ? (
                <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                  <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">Ready to build your brief?</h3>
                  <p className="text-muted-foreground mt-2">Add source materials and click "Generate Brief" to see the magic happen.</p>
                </div>
              ) : (
                <Tabs defaultValue="brief" className="h-full flex flex-col">
                  <div className="p-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="brief">Brief</TabsTrigger>
                      <TabsTrigger value="conflicts" className="relative">
                        Conflicts
                        {conflicts && conflicts.length > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">{conflicts.length}</span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="brief" className="mt-0 p-6 pt-0 text-sm flex-grow">
                    {brief ? (
                      <div className="space-y-6">
                        {renderBriefSection('project_overview', brief.project_overview || [])}
                        {renderBriefSection('goals', brief.goals || [])}
                        {renderBriefSection('in_scope', brief.in_scope || [])}
                        {renderBriefSection('out_of_scope', brief.out_of_scope || [])}
                        {renderBriefSection('constraints', brief.constraints || [])}
                        {renderBriefSection('assumptions', brief.assumptions || [])}
                        {renderBriefSection('risks', brief.risks || [])}
                        {renderBriefSection('acceptance_criteria', brief.acceptance_criteria || [])}
                        {renderBriefSection('open_questions', brief.open_questions || [])}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center pt-8">No brief generated.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="conflicts" className="mt-0 p-6 pt-0 flex-grow">
                    {conflicts && conflicts.length > 0 ? (
                      <>
                        <Accordion type="single" collapsible className="w-full">
                          {conflicts.map((conflict, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                              <AccordionTrigger>
                                <div className="flex items-center gap-3 text-left">
                                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                                  <span>Conflict in {conflict.category}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4 pt-2">
                                <p className="font-medium">A conflict was detected in the '{conflict.category}' category.</p>
                                <div className="space-y-4">
                                  <h4 className="text-sm font-semibold text-muted-foreground">Conflicting Statements</h4>
                                  <div className="space-y-3">
                                    <label className={`flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer transition-colors hover:bg-accent/5 ${conflictResolutions[index] === conflict.statement_a ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                      <input
                                        type="radio"
                                        name={`conflict-${index}`}
                                        value="a"
                                        checked={conflictResolutions[index] === conflict.statement_a}
                                        onChange={() => setConflictResolutions(prev => ({ ...prev, [index]: conflict.statement_a }))}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <blockquote className="italic text-muted-foreground">
                                          "{conflict.statement_a}"
                                        </blockquote>
                                        <span className="block text-xs text-muted-foreground mt-1">Source: {getSourceTitle(conflict.source_a)}</span>
                                      </div>
                                    </label>
                                    <label className={`flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer transition-colors hover:bg-accent/5 ${conflictResolutions[index] === conflict.statement_b ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                      <input
                                        type="radio"
                                        name={`conflict-${index}`}
                                        value="b"
                                        checked={conflictResolutions[index] === conflict.statement_b}
                                        onChange={() => setConflictResolutions(prev => ({ ...prev, [index]: conflict.statement_b }))}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <blockquote className="italic text-muted-foreground">
                                          "{conflict.statement_b}"
                                        </blockquote>
                                        <span className="block text-xs text-muted-foreground mt-1">Source: {getSourceTitle(conflict.source_b)}</span>
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                        {conflicts && conflicts.length > 0 && (
                          <div className="mt-6 flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setConflictResolutions({})}
                              disabled={Object.keys(conflictResolutions).length === 0}
                            >
                              Clear Selections
                            </Button>
                            <Button
                              onClick={async () => {
                                const hasAllResolutions = conflicts.every((_, index) => conflictResolutions[index]);
                                if (!hasAllResolutions) {
                                  toast({
                                    title: 'Incomplete Resolution',
                                    description: 'Please select a resolution for all conflicts.',
                                    variant: 'destructive',
                                  });
                                  return;
                                }

                                const timestamp = new Date().toLocaleString();
                                const resolutionText = conflicts.map((conflict, index) => {
                                  const choice = conflictResolutions[index];
                                  return `- Resolved Conflict (${conflict.category}): ${choice}`;
                                }).join('\n');

                                const finalContent = `Confirmed Project Requirements (Resolved Conflicts - ${timestamp}):\n\n${resolutionText}`;

                                try {
                                  // Add as new source material
                                  await addDoc(projectsRef!, {
                                    title: `Resolved Conflicts - ${timestamp}`,
                                    content: finalContent,
                                    members: { [user!.uid]: 'owner' }
                                  });

                                  // Update brief doc to clear conflicts list so they don't show up again until re-generation.
                                  if (briefsRef && currentBriefDoc) {
                                    await updateDoc(doc(briefsRef, currentBriefDoc.id), {
                                      conflicts: []
                                    });
                                  }

                                  setConflictResolutions({});
                                  toast({
                                    title: 'Resolutions Confirmed',
                                    description: 'Your choices have been added as a new source material. Please generate the brief again.',
                                  });
                                } catch (error) {
                                  console.error("Error saving resolutions:", error);
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to save resolutions. Please try again.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              disabled={Object.keys(conflictResolutions).length === 0}
                            >
                              Confirm Resolutions
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center">
                        <h3 className="font-semibold text-lg">No conflicts found</h3>
                        <p className="text-sm mt-1">The AI didn't detect any conflicting requirements in your source materials.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </Card>
          </div>
        </div>

        {/* Re-using dialog logic/component from dashboard if kept there, or duplicating it here if we want it to be same context */}
        {/* Since logic is in shared parent function/state, we can put dialog outside */}
        <Dialog open={!!projectToRename} onOpenChange={(open) => !open && setProjectToRename(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Project Name"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectToRename(null)}>Cancel</Button>
              <Button onClick={handleRenameProject}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
