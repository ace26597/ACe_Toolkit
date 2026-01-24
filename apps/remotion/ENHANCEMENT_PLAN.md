# Video Factory Enhancement Plan

## Current Workflow (Problems)

```
User Input → Generate Script → Parse Text → Basic Props → Render
              (Claude)         (regex)      (simple)     (basic)
```

**Issues:**
1. **No transitions** - Sections appear/disappear abruptly (hard cuts)
2. **Basic animations only** - Just fadeIn, slideUp, scale, typewriter
3. **No timing curves** - Linear interpolation only, no spring/easing
4. **No visual variety** - All slides look identical
5. **Text-heavy** - No visual emphasis or hierarchy
6. **No section types** - Hook, content, CTA all rendered same way

## New Workflow (Enhanced)

```
User Input → Generate Script → Enhance with Skill → Rich Props → Render
              (Claude)         (Claude + remotion)   (detailed)   (pro)
```

### Step 1: Script Generation (Existing)
Same as current - Claude generates script with timing markers.

### Step 2: Video Enhancement (NEW)
Before rendering, use Claude Code with `remotion-best-practices` skill to:

1. **Analyze Content Structure**
   - Identify key phrases for emphasis
   - Detect questions, lists, conclusions
   - Find emotional beats

2. **Design Scene Transitions**
   - Hook → Content: `slide(from-bottom)` with `springTiming`
   - Content → Content: `fade()` with `linearTiming`
   - Content → CTA: `wipe()` or `slide(from-right)`

3. **Select Animation Timing**
   - Hook text: `spring({damping: 8})` (bouncy, attention-grabbing)
   - Content text: `spring({damping: 200})` (smooth reveal)
   - Bullet points: staggered with `delay` parameter
   - CTA: `spring({damping: 20, stiffness: 200})` (snappy)

4. **Add Visual Elements**
   - Highlight key words with accent color
   - Add subtle background motion
   - Progress indicators between sections
   - Emoji/icons for visual breaks

5. **Create Enhanced Props**
   ```json
   {
     "scenes": [
       {
         "type": "hook",
         "text": "Did you know...",
         "animation": "scale",
         "timing": {"type": "spring", "damping": 8},
         "emphasis": ["Did you know"],
         "transitionOut": {"type": "slide", "direction": "from-bottom", "duration": 15}
       },
       {
         "type": "content",
         "title": "Key Points",
         "bullets": ["Point 1", "Point 2"],
         "animation": "slideUp",
         "timing": {"type": "spring", "damping": 200},
         "bulletDelay": 10,
         "transitionIn": {"type": "fade", "duration": 10},
         "transitionOut": {"type": "wipe", "duration": 15}
       }
     ]
   }
   ```

## Implementation Tasks

### Phase 1: Install Transitions Package
```bash
cd apps/remotion
npx remotion add @remotion/transitions
```

### Phase 2: Create Enhanced Components

1. **TransitionVideo.tsx** - New composition using `<TransitionSeries>`
2. **EnhancedSlide.tsx** - Slide with spring animations and emphasis
3. **ProgressBar.tsx** - Visual progress indicator
4. **EmphasizedText.tsx** - Text with highlighted keywords

### Phase 3: Create Enhancement Skill

Create `~/.claude/skills/video-enhancer/` with prompts for:
- Analyzing script content
- Generating transition specs
- Selecting appropriate animations
- Creating visual hierarchy

### Phase 4: Backend Integration

1. **New endpoint**: `POST /video-factory/projects/{id}/ideas/{id}/enhance`
   - Runs Claude Code with remotion + video-enhancer skills
   - Returns enhanced props JSON

2. **Modify render flow**:
   - Before render → Call enhance endpoint
   - Enhanced props → Use TransitionVideo composition

### Phase 5: Frontend Updates

1. Add "Enhance Before Render" toggle
2. Show enhancement preview
3. Allow manual prop editing

## Enhanced Props Schema

```typescript
interface EnhancedVideoProps {
  scenes: EnhancedScene[];
  globalStyle: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
  };
  audio: {
    musicUrl?: string;
    musicVolume: number;
    voiceoverUrl?: string;
  };
}

interface EnhancedScene {
  id: string;
  type: "hook" | "content" | "bullet-list" | "quote" | "cta";
  duration: number; // frames

  // Content
  text?: string;
  title?: string;
  bullets?: string[];
  emphasis?: string[]; // words to highlight

  // Animation
  animation: "fadeIn" | "slideUp" | "slideDown" | "scale" | "typewriter" | "bounce";
  timing: {
    type: "linear" | "spring" | "easing";
    config?: {
      damping?: number;
      stiffness?: number;
      mass?: number;
      easing?: string; // "quad" | "sin" | "exp" | "circle"
    };
  };

  // Transitions
  transitionIn?: {
    type: "fade" | "slide" | "wipe" | "flip" | "clockWipe";
    direction?: "from-left" | "from-right" | "from-top" | "from-bottom";
    duration: number;
  };
  transitionOut?: {
    type: "fade" | "slide" | "wipe" | "flip" | "clockWipe";
    direction?: "from-left" | "from-right" | "from-top" | "from-bottom";
    duration: number;
  };

  // Visual
  background?: {
    type: "solid" | "gradient" | "image" | "video";
    value: string;
    opacity?: number;
  };
}
```

## Example Enhancement

**Input Script:**
```
[0-3s] Did you know Claude Code can run 100 agents in parallel?
[3-15s] In 2026, Anthropic released massive updates...
[15-45s] First - Background Agents. Second - Hooks. Third - MCP.
[45-55s] These updates changed everything.
[55-60s] Follow for more AI dev tips!
```

**Enhanced Output:**
```json
{
  "scenes": [
    {
      "type": "hook",
      "text": "Did you know Claude Code can run 100 agents in parallel?",
      "emphasis": ["100 agents", "parallel"],
      "animation": "scale",
      "timing": {"type": "spring", "damping": 8},
      "transitionOut": {"type": "slide", "direction": "from-bottom", "duration": 20}
    },
    {
      "type": "content",
      "title": "2026 Updates",
      "text": "Anthropic released massive updates that changed development forever.",
      "animation": "slideUp",
      "timing": {"type": "spring", "damping": 200},
      "transitionIn": {"type": "fade", "duration": 15},
      "transitionOut": {"type": "fade", "duration": 15}
    },
    {
      "type": "bullet-list",
      "title": "Key Features",
      "bullets": ["Background Agents", "Hooks System", "MCP Servers"],
      "bulletDelay": 20,
      "animation": "slideUp",
      "timing": {"type": "spring", "damping": 150},
      "transitionIn": {"type": "slide", "direction": "from-right", "duration": 15}
    },
    {
      "type": "content",
      "text": "These updates changed everything.",
      "emphasis": ["changed everything"],
      "animation": "fadeIn",
      "timing": {"type": "easing", "config": {"easing": "inOut(quad)"}},
      "transitionOut": {"type": "wipe", "duration": 20}
    },
    {
      "type": "cta",
      "text": "Follow for more AI dev tips!",
      "animation": "bounce",
      "timing": {"type": "spring", "damping": 20, "stiffness": 200},
      "transitionIn": {"type": "slide", "direction": "from-bottom", "duration": 15}
    }
  ]
}
```

## Priority Order

1. **[HIGH]** Install @remotion/transitions and create TransitionVideo composition
2. **[HIGH]** Create video-enhancer skill with Claude prompts
3. **[MEDIUM]** Add enhance endpoint to backend
4. **[MEDIUM]** Update frontend with enhance toggle
5. **[LOW]** Add visual elements (progress bar, icons)
6. **[LOW]** Add template presets for different styles

## Timeline

- Phase 1-2: Remotion component updates
- Phase 3: Video enhancer skill
- Phase 4: Backend integration
- Phase 5: Frontend polish
