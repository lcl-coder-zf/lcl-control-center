# Graph Report - /Users/llano/Desktop/lcl-control-center  (2026-06-30)

## Corpus Check
- 54 files · ~30,342 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 156 nodes · 159 edges · 38 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 31 edges
2. `handleSubmit()` - 6 edges
3. `uploadFile()` - 5 edges
4. `POST()` - 4 edges
5. `fetchEvents()` - 3 edges
6. `markComplete()` - 3 edges
7. `set()` - 3 edges
8. `fetchAll()` - 3 edges
9. `handleDeleteUploaded()` - 3 edges
10. `uploadFile()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `getDownloadUrl()` --calls--> `createClient()`  [INFERRED]
  /Users/llano/Desktop/lcl-control-center/src/app/(dashboard)/documentos/page.tsx → /Users/llano/Desktop/lcl-control-center/src/lib/supabase/server.ts
- `handleSubmit()` --calls--> `createClient()`  [INFERRED]
  /Users/llano/Desktop/lcl-control-center/src/app/(dashboard)/proyectos/[id]/editar/EditarProyectoForm.tsx → /Users/llano/Desktop/lcl-control-center/src/lib/supabase/server.ts
- `handleSubmit()` --calls--> `createClient()`  [INFERRED]
  /Users/llano/Desktop/lcl-control-center/src/app/(dashboard)/proyectos/nuevo/NuevoProyectoForm.tsx → /Users/llano/Desktop/lcl-control-center/src/lib/supabase/server.ts
- `POST()` --calls--> `createClient()`  [INFERRED]
  /Users/llano/Desktop/lcl-control-center/src/app/api/onlyoffice/callback/route.ts → /Users/llano/Desktop/lcl-control-center/src/lib/supabase/server.ts
- `handleLogin()` --calls--> `createClient()`  [INFERRED]
  /Users/llano/Desktop/lcl-control-center/src/app/(auth)/login/page.tsx → /Users/llano/Desktop/lcl-control-center/src/lib/supabase/server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (18): handleDelete(), DashboardLayout(), handleSubmit(), EditarClientePage(), EditarProyectoPage(), handleLogin(), NuevaTareaPage(), NuevoProyectoPage() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (15): adminSetFileStatus(), changeEditableStatus(), createEditableDoc(), emoji(), ext(), goBackToBrowser(), handleFiles(), handleFolderUpload() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (5): persistContent(), createDoc(), goBack(), loadDocs(), openDoc()

### Community 3 - "Community 3"
Cohesion: 0.33
Nodes (4): handleSubmit(), set(), uploadFile(), uploadLogo()

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (0): 

### Community 5 - "Community 5"
Cohesion: 0.4
Nodes (2): handleSubmit(), uploadLogo()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (3): fetchAll(), getDownloadUrl(), handleDeleteUploaded()

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (2): mimeType(), POST()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (1): handleSubmit()

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (2): fetchEvents(), markComplete()

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (2): countWords(), DocEditor()

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (1): handleSubmit()

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 13`** (2 nodes): `proxy()`, `proxy.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `Home()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `CompanyAvatar()`, `CompanyAvatar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `Skeleton()`, `Skeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `check()`, `AppShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `createClient()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `ProyectosList.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `OnlyOfficeEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `ClientesList.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 0` to `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 12`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Why does `persistContent()` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `createClient()` (e.g. with `POST()` and `handleLogin()`) actually correct?**
  _`createClient()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._