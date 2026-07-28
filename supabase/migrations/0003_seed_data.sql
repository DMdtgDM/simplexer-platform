-- ============================================================================
-- Seed data — Phase 1 vertical slice (SRS §21 Phase 1 step 5 & 6)
--   Formal Track:  Grade 11 -> Physics -> Kinematics (4 lessons + quiz)
--   Interest Track: Programming -> Intro to Python (4 lessons + quiz)
-- Also seeds the full grade/subject/category shells (per §6.1 "structure
-- ready for more") so the browsing UI isn't a ghost town of one card.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Grades (Formal Track top level)
-- ---------------------------------------------------------------------------
insert into public.grades (id, name, slug, tag, "order") values
  ('11111111-1111-1111-1111-111111111109', 'Grade 9',  'grade-9',  null, 1),
  ('11111111-1111-1111-1111-111111111110', 'Grade 10', 'grade-10', 'National Exam Prep', 2),
  ('11111111-1111-1111-1111-111111111111', 'Grade 11', 'grade-11', null, 3),
  ('11111111-1111-1111-1111-111111111112', 'Grade 12', 'grade-12', 'National Exam Prep', 4),
  ('11111111-1111-1111-1111-111111111113', 'University Freshman', 'university-freshman', null, 5),
  ('11111111-1111-1111-1111-111111111114', 'Remedial / Exam-Prep', 'remedial', 'Exam Prep', 6);

-- ---------------------------------------------------------------------------
-- Subjects for Grade 11 (the populated grade)
-- ---------------------------------------------------------------------------
insert into public.subjects (id, grade_id, name, slug, icon, "order") values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Physics',   'physics',   'atom',     1),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Chemistry', 'chemistry', 'flask-conical', 2),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Mathematics','mathematics','sigma',   3),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'English',   'english',   'book-open', 4),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'Biology',   'biology',   'leaf',      5);

-- ---------------------------------------------------------------------------
-- Topics for Physics (Kinematics is the populated topic)
-- ---------------------------------------------------------------------------
insert into public.topics (id, subject_id, name, slug, description, "order") values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Kinematics', 'kinematics',
   'The study of motion — position, velocity, and acceleration — without worrying about what causes it.', 1),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'Dynamics', 'dynamics',
   'Newton''s laws and the forces that cause motion.', 2),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 'Work, Energy & Power', 'work-energy-power',
   'How energy is transferred and transformed during motion.', 3);

-- ---------------------------------------------------------------------------
-- Lessons under Kinematics (the fully-populated vertical slice)
-- ---------------------------------------------------------------------------
insert into public.lessons (id, topic_id, slug, title, content, video_url, attachment_url, attachment_size_kb, est_minutes, "order") values
(
  '44444444-4444-4444-4444-444444444401',
  '33333333-3333-3333-3333-333333333301',
  'motion-and-reference-frames',
  'Motion and Reference Frames',
$md$## What does it mean for something to "move"?

Before we can measure motion, we need a **reference frame** — a fixed point (or object) we measure position relative to. አንድ ነገር እየተንቀሳቀሰ ነው የምንለው ከሌላ ነገር አንፃር ሲሆን ብቻ ነው (something is only "moving" relative to something else).

A bus passenger looks stationary to the person sitting next to them, but to someone standing on the street, that same passenger is moving at 60 km/h. Neither observer is "wrong" — they just chose different reference frames.

### Position, Distance, and Displacement

- **Position** is where an object is, measured from a chosen origin.
- **Distance** is the *total path length* traveled — always positive, no direction.
- **Displacement** is the *change in position* — a vector, so it has both magnitude and direction:

$$\vec{d} = \vec{x}_f - \vec{x}_i$$

**Example:** Selam walks 300 m east, then 100 m west.
- Distance traveled: $300 + 100 = 400\text{ m}$
- Displacement: $300 - 100 = 200\text{ m east}$

Notice distance and displacement gave *different* numbers — this trips up almost every student on the national exam, so get comfortable with the distinction now.

### Scalars vs. Vectors

A **scalar** has only magnitude (e.g., distance = 400 m, speed = 5 m/s). A **vector** has magnitude *and* direction (e.g., displacement = 200 m east, velocity = 5 m/s north). We'll write vectors with an arrow, $\vec{v}$, throughout this course.

### Quick check
Try sketching Selam's walk on a number line before moving to the next lesson — being able to *see* displacement as "final minus initial" will make every kinematics equation in this topic click faster.
$md$,
  'https://www.youtube.com/watch?v=MK6-eZFI9lg',
  null, null, 6, 1
),
(
  '44444444-4444-4444-4444-444444444402',
  '33333333-3333-3333-3333-333333333301',
  'speed-velocity-and-graphs',
  'Speed, Velocity, and Motion Graphs',
$md$## Average speed vs. average velocity

**Average speed** is total distance over total time (always positive):

$$\bar{v}_{speed} = \frac{\text{total distance}}{\text{total time}}$$

**Average velocity** is total *displacement* over total time (can be negative, depending on direction):

$$\vec{v}_{avg} = \frac{\Delta \vec{x}}{\Delta t} = \frac{\vec{x}_f - \vec{x}_i}{t_f - t_i}$$

**Instantaneous velocity** is the velocity at one specific moment — on a position-time graph, it's the *slope of the tangent line* at that point.

### Reading position-time and velocity-time graphs

This is the single most exam-relevant skill in this lesson:

| Graph type | Slope means | Flat line means | Curve means |
|---|---|---|---|
| Position–time | velocity | object at rest | changing velocity (accelerating) |
| Velocity–time | acceleration | constant velocity | changing acceleration |

On a **velocity–time graph**, the *area under the curve* gives displacement — a fact you'll use constantly once we reach the equations of motion in the next lesson.

### Worked example

A car's position changes from $x_i = 20\text{ m}$ to $x_f = 180\text{ m}$ in $8\text{ s}$.

$$\vec{v}_{avg} = \frac{180 - 20}{8} = \frac{160}{8} = 20\text{ m/s}$$

ፍጥነት (speed) የሚለካው በሜትር በሰከንድ (m/s) ነው — this unit, meters per second, is what you should default to unless a problem specifies otherwise.
$md$,
  'https://www.youtube.com/watch?v=aC0PCP4qbnc',
  'https://example-storage.supabase.co/attachments/kinematics-graphs-worksheet.pdf', 340, 7, 2
),
(
  '44444444-4444-4444-4444-444444444403',
  '33333333-3333-3333-3333-333333333301',
  'acceleration-and-equations-of-motion',
  'Acceleration and the Equations of Motion',
$md$## Acceleration

Acceleration is the rate of change of velocity:

$$\vec{a} = \frac{\Delta \vec{v}}{\Delta t} = \frac{\vec{v}_f - \vec{v}_i}{t}$$

Units: meters per second squared, $\text{m/s}^2$. Positive acceleration doesn't always mean "speeding up" — it means speeding up *in the positive direction*, or slowing down while moving in the negative direction (deceleration).

## The four equations of motion (constant acceleration)

These four equations are the backbone of every kinematics problem you'll see on the Grade 11/12 exams. Memorize them, but more importantly, know *which variable is missing* from each one:

$$v_f = v_i + at$$

$$\Delta x = v_i t + \frac{1}{2}at^2$$

$$v_f^2 = v_i^2 + 2a\Delta x$$

$$\Delta x = \frac{(v_i + v_f)}{2}t$$

### How to choose the right equation

Write down what you're given and what you need to find. Whichever variable is *not* mentioned in the problem tells you which equation to skip needing — e.g., if time isn't given or asked for, use $v_f^2 = v_i^2 + 2a\Delta x$.

### Worked example

A car starts at rest ($v_i = 0$) and accelerates at $3\text{ m/s}^2$ for $5\text{ s}$. Find the displacement.

We have $v_i, a, t$ — missing $v_f$ — so use:

$$\Delta x = v_i t + \frac{1}{2}at^2 = (0)(5) + \frac{1}{2}(3)(5)^2 = 37.5\text{ m}$$

**Common mistake:** mixing up $v_i$ and $v_f$ in the wrong slot, or forgetting to square $t$ in the second equation. Slow down and label your variables before you plug in numbers — on exam day this is the #1 source of lost points on kinematics.
$md$,
  'https://www.youtube.com/watch?v=6mnV_zNaeCs',
  null, null, 8, 3
),
(
  '44444444-4444-4444-4444-444444444404',
  '33333333-3333-3333-3333-333333333301',
  'free-fall-and-projectile-motion',
  'Free Fall and Projectile Motion',
$md$## Free fall

An object in free fall experiences only gravity, with acceleration $g \approx 9.8\text{ m/s}^2$ directed downward (Ethiopia's textbooks commonly round this to $10\text{ m/s}^2$ for calculation ease — check which your teacher/exam uses). All four equations of motion from the previous lesson still apply, with $a = -g$ if "up" is positive.

**Key insight:** free fall is independent of mass — a stone and a feather fall at the same rate *in a vacuum*. Air resistance is what makes feathers fall slower in real life, not gravity itself.

## Projectile motion

A projectile launched at an angle undergoes **two independent motions simultaneously**:

- **Horizontal:** constant velocity (no acceleration, ignoring air resistance) — $x = v_{ix}t$
- **Vertical:** free fall — $y = v_{iy}t - \frac{1}{2}gt^2$

The trick to every projectile problem is splitting the initial velocity into components first:

$$v_{ix} = v_i\cos\theta \qquad v_{iy} = v_i\sin\theta$$

### Worked example

A ball is thrown at $20\text{ m/s}$ at $30°$ above the horizontal. Find the time to reach maximum height (where $v_y = 0$).

$$v_{iy} = 20\sin(30°) = 10\text{ m/s}$$
$$t = \frac{v_{iy}}{g} = \frac{10}{9.8} \approx 1.02\text{ s}$$

This lesson closes out Kinematics — take the quiz below to check your understanding before moving to Dynamics, where we finally answer *why* objects accelerate in the first place.
$md$,
  'https://www.youtube.com/watch?v=WT9CbfTEmAY',
  'https://example-storage.supabase.co/attachments/projectile-motion-formula-sheet.pdf', 210, 6, 4
);

-- ---------------------------------------------------------------------------
-- Quiz for Kinematics (attached to the final lesson, covers the whole topic)
-- ---------------------------------------------------------------------------
insert into public.quizzes (id, lesson_id, title, pass_threshold) values
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444404', 'Kinematics Practice Quiz', 60);

insert into public.questions (id, quiz_id, question_text, explanation, "order") values
  ('66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555501',
   'A student walks 400 m east then 400 m west. What is their displacement?',
   'Displacement is final position minus initial position. Since the student ends up back where they started, displacement is zero — even though they walked a distance of 800 m.', 1),
  ('66666666-6666-6666-6666-666666666602', '55555555-5555-5555-5555-555555555501',
   'On a velocity-time graph, the area under the curve represents:',
   'The area under a velocity-time graph gives displacement, because displacement is velocity multiplied by time — exactly what "area" computes for a rectangle or triangle on that graph.', 2),
  ('66666666-6666-6666-6666-666666666603', '55555555-5555-5555-5555-555555555501',
   'A car accelerates from rest at 4 m/s² for 6 seconds. What is its final velocity?',
   'Using v_f = v_i + at: v_f = 0 + (4)(6) = 24 m/s.', 3),
  ('66666666-6666-6666-6666-666666666604', '55555555-5555-5555-5555-555555555501',
   'In projectile motion (ignoring air resistance), the horizontal velocity:',
   'Horizontal velocity stays constant throughout the flight because there is no horizontal acceleration — gravity only acts vertically.', 4),
  ('66666666-6666-6666-6666-666666666605', '55555555-5555-5555-5555-555555555501',
   'Two objects, a stone and a feather, are dropped in a vacuum from the same height. Which hits the ground first?',
   'In a vacuum there is no air resistance, so both objects experience the same gravitational acceleration g and hit the ground at the same time, regardless of mass.', 5);

insert into public.question_options (question_id, option_text, is_correct, "order") values
  ('66666666-6666-6666-6666-666666666601', '800 m east', false, 1),
  ('66666666-6666-6666-6666-666666666601', '0 m', true, 2),
  ('66666666-6666-6666-6666-666666666601', '400 m east', false, 3),
  ('66666666-6666-6666-6666-666666666601', '800 m west', false, 4),

  ('66666666-6666-6666-6666-666666666602', 'Acceleration', false, 1),
  ('66666666-6666-6666-6666-666666666602', 'Displacement', true, 2),
  ('66666666-6666-6666-6666-666666666602', 'Jerk', false, 3),
  ('66666666-6666-6666-6666-666666666602', 'Force', false, 4),

  ('66666666-6666-6666-6666-666666666603', '4 m/s', false, 1),
  ('66666666-6666-6666-6666-666666666603', '6 m/s', false, 2),
  ('66666666-6666-6666-6666-666666666603', '24 m/s', true, 3),
  ('66666666-6666-6666-6666-666666666603', '10 m/s', false, 4),

  ('66666666-6666-6666-6666-666666666604', 'Increases steadily', false, 1),
  ('66666666-6666-6666-6666-666666666604', 'Decreases steadily', false, 2),
  ('66666666-6666-6666-6666-666666666604', 'Stays constant', true, 3),
  ('66666666-6666-6666-6666-666666666604', 'Becomes zero at the peak', false, 4),

  ('66666666-6666-6666-6666-666666666605', 'The stone', false, 1),
  ('66666666-6666-6666-6666-666666666605', 'The feather', false, 2),
  ('66666666-6666-6666-6666-666666666605', 'They land at the same time', true, 3),
  ('66666666-6666-6666-6666-666666666605', 'It depends on their color', false, 4);

-- ---------------------------------------------------------------------------
-- Interest Track: categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, slug, icon, "order") values
  ('77777777-7777-7777-7777-777777777701', 'Programming', 'programming', 'code', 1),
  ('77777777-7777-7777-7777-777777777702', 'Languages', 'languages', 'languages', 2),
  ('77777777-7777-7777-7777-777777777703', 'Personal Finance', 'personal-finance', 'wallet', 3),
  ('77777777-7777-7777-7777-777777777704', 'Design', 'design', 'palette', 4);

-- ---------------------------------------------------------------------------
-- Course: Intro to Python (the populated Interest Track course)
-- ---------------------------------------------------------------------------
insert into public.courses (id, category_id, title, slug, description, difficulty, cover_image_url, instructor, "order") values
  ('88888888-8888-8888-8888-888888888801', '77777777-7777-7777-7777-777777777701',
   'Intro to Python', 'intro-to-python',
   'A beginner-friendly, hands-on introduction to programming using Python — no prior coding experience needed. Learn the fundamentals that every other language builds on.',
   'beginner', null, 'Simplexer Team', 1);

insert into public.lessons (id, course_id, slug, title, content, video_url, attachment_url, attachment_size_kb, est_minutes, "order") values
(
  '99999999-9999-9999-9999-999999999901',
  '88888888-8888-8888-8888-888888888801',
  'what-is-python-and-setup',
  'What is Python, and Setting Up',
$md$## Why Python?

Python is one of the most widely used programming languages in the world — it powers websites, data analysis, artificial intelligence, and automation scripts. It's a great first language because its syntax reads almost like plain English.

Python ቀላል እና ለጀማሪዎች ምቹ የፕሮግራሚንግ ቋንቋ ነው (Python is a simple and beginner-friendly programming language) — that reputation is well earned.

### Installing Python

1. Go to python.org/downloads and download the latest stable release for your operating system.
2. During installation on Windows, make sure to check **"Add Python to PATH"** — this one checkbox saves a lot of frustration later.
3. Verify the install by opening a terminal/command prompt and typing:

\`\`\`
python --version
\`\`\`

If you see a version number like \`Python 3.12.x\`, you're ready to go.

### Your first program

Open a new file called \`hello.py\` and write:

\`\`\`python
print("Hello, Simplexer!")
\`\`\`

Run it with \`python hello.py\`. Congratulations — you've written and executed your first program. Every program you'll ever write, no matter how complex, is built the same way: write instructions, run them, see what happens, adjust.

### A note on data-friendly learning

If typing installs on your current device is inconvenient right now, tools like [replit.com](https://replit.com) let you write and run Python directly in a browser with no install at all — useful if you're following along on a phone first and will set up a full install later.
$md$,
  null, null, null, 5, 1
),
(
  '99999999-9999-9999-9999-999999999902',
  '88888888-8888-8888-8888-888888888801',
  'variables-and-data-types',
  'Variables and Data Types',
$md$## Variables

A variable is a name that stores a value so you can use it later:

\`\`\`python
name = "Selam"
age = 17
height = 1.65
is_student = True
\`\`\`

Python figures out the *type* automatically based on what you assign — this is called **dynamic typing**.

### The core data types

| Type | Example | Description |
|---|---|---|
| \`str\` | \`"hello"\` | text, always in quotes |
| \`int\` | \`42\` | whole numbers |
| \`float\` | \`3.14\` | decimal numbers |
| \`bool\` | \`True\` / \`False\` | logical yes/no |
| \`list\` | \`[1, 2, 3]\` | an ordered, changeable collection |

### Naming rules

Variable names can contain letters, numbers, and underscores, but can't start with a number and can't contain spaces. \`student_score\` is valid; \`2ndScore\` is not.

### Type conversion

Sometimes you need to convert between types — very common when reading user input, which always comes in as text:

\`\`\`python
age_text = "17"
age_number = int(age_text)   # now it's a real number you can do math with
print(age_number + 1)         # 18
\`\`\`

### Try it yourself

Before moving on, write three variables describing yourself (name, age, favorite subject) and print a sentence combining all three using an f-string: \`f"My name is {name} and I love {subject}."\`
$md$,
  'https://www.youtube.com/watch?v=cQT33yu9pY8',
  null, null, 8, 2
),
(
  '99999999-9999-9999-9999-999999999903',
  '88888888-8888-8888-8888-888888888801',
  'control-flow-if-else-loops',
  'Control Flow: if/else and Loops',
$md$## Making decisions with if/else

Programs become useful when they can react differently depending on conditions:

\`\`\`python
score = 75

if score >= 90:
    print("A")
elif score >= 70:
    print("B")
else:
    print("Needs improvement")
\`\`\`

Indentation (the spaces before \`print\`) is not just style in Python — it's how the language knows what belongs inside the \`if\` block. Getting this wrong is the single most common beginner error.

## Repeating actions with loops

### \`for\` loops — when you know how many times to repeat

\`\`\`python
for i in range(5):
    print(i)   # prints 0, 1, 2, 3, 4
\`\`\`

### \`while\` loops — when you repeat until a condition changes

\`\`\`python
count = 0
while count < 3:
    print("Studying...")
    count += 1
\`\`\`

**Watch out:** if the condition in a \`while\` loop never becomes false, your program will run forever — this is called an infinite loop, and it's the second most common beginner bug after indentation errors.

### Combining both

A very common real pattern is looping over a list and making a decision each time:

\`\`\`python
scores = [55, 82, 91, 40]
for s in scores:
    if s >= 60:
        print(f"{s}: pass")
    else:
        print(f"{s}: fail")
\`\`\`
$md$,
  'https://www.youtube.com/watch?v=6iF8Xb7Z3wQ',
  'https://example-storage.supabase.co/attachments/python-control-flow-cheatsheet.pdf', 150, 7, 3
),
(
  '99999999-9999-9999-9999-999999999904',
  '88888888-8888-8888-8888-888888888801',
  'functions-and-modules',
  'Functions and Modules',
$md$## Why functions?

A function is a reusable block of code you define once and call as many times as you want — instead of copy-pasting the same logic everywhere:

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

print(greet("Nahom"))
print(greet("Bethel"))
\`\`\`

\`name\` here is a **parameter** — a placeholder for whatever value gets passed in when the function is *called*. The \`return\` keyword sends a value back to whoever called the function.

### Functions with default values

\`\`\`python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Selam"))                 # Hello, Selam!
print(greet("Selam", "Welcome back")) # Welcome back, Selam!
\`\`\`

## Modules — reusing other people's code

Python comes with a huge standard library. Instead of writing everything from scratch, you \`import\` existing functionality:

\`\`\`python
import math

print(math.sqrt(16))   # 4.0
print(math.pi)          # 3.14159...
\`\`\`

This is the same principle behind almost all real-world software: nobody writes everything from zero. You'll spend as much time learning to *use* well-built modules as you spend writing your own functions.

### Course wrap-up

You've now covered the four pillars every language builds on: values & variables, control flow, repetition, and reusable logic (functions). Take the quiz below, then keep practicing by writing small scripts — a temperature converter, a simple quiz game, a to-do list — that combine everything from this course.
$md$,
  'https://www.youtube.com/watch?v=9Os0o3wzS_I',
  null, null, 9, 4
);

-- ---------------------------------------------------------------------------
-- Quiz for Intro to Python (attached to the final lesson)
-- ---------------------------------------------------------------------------
insert into public.quizzes (id, lesson_id, title, pass_threshold) values
  ('55555555-5555-5555-5555-555555555502', '99999999-9999-9999-9999-999999999904', 'Intro to Python Quiz', 60);

insert into public.questions (id, quiz_id, question_text, explanation, "order") values
  ('66666666-6666-6666-6666-666666666611', '55555555-5555-5555-5555-555555555502',
   'What will `type(3.14)` return in Python?',
   'Numbers with a decimal point are the "float" type in Python, as opposed to "int" for whole numbers.', 1),
  ('66666666-6666-6666-6666-666666666612', '55555555-5555-5555-5555-555555555502',
   'What does indentation control in a Python if/else block?',
   'Python uses indentation (whitespace) instead of curly braces to define which lines of code belong inside a block, like an if statement or a loop.', 2),
  ('66666666-6666-6666-6666-666666666613', '55555555-5555-5555-5555-555555555502',
   'How many times will `for i in range(4):` run its loop body?',
   'range(4) produces the sequence 0, 1, 2, 3 — four values — so the loop body runs four times.', 3),
  ('66666666-6666-6666-6666-666666666614', '55555555-5555-5555-5555-555555555502',
   'What keyword sends a value back from a function to its caller?',
   'The `return` keyword is used inside a function to send a result back to the code that called it.', 4);

insert into public.question_options (question_id, option_text, is_correct, "order") values
  ('66666666-6666-6666-6666-666666666611', 'int', false, 1),
  ('66666666-6666-6666-6666-666666666611', 'float', true, 2),
  ('66666666-6666-6666-6666-666666666611', 'str', false, 3),
  ('66666666-6666-6666-6666-666666666611', 'bool', false, 4),

  ('66666666-6666-6666-6666-666666666612', 'It has no effect, it is only for style', false, 1),
  ('66666666-6666-6666-6666-666666666612', 'It defines which lines belong inside the block', true, 2),
  ('66666666-6666-6666-6666-666666666612', 'It determines the variable''s data type', false, 3),
  ('66666666-6666-6666-6666-666666666612', 'It sets the loop count', false, 4),

  ('66666666-6666-6666-6666-666666666613', '3 times', false, 1),
  ('66666666-6666-6666-6666-666666666613', '4 times', true, 2),
  ('66666666-6666-6666-6666-666666666613', '5 times', false, 3),
  ('66666666-6666-6666-6666-666666666613', 'It runs forever', false, 4),

  ('66666666-6666-6666-6666-666666666614', 'import', false, 1),
  ('66666666-6666-6666-6666-666666666614', 'def', false, 2),
  ('66666666-6666-6666-6666-666666666614', 'return', true, 3),
  ('66666666-6666-6666-6666-666666666614', 'print', false, 4);
