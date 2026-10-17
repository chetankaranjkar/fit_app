import { CalendarDays, Check, Flame, Leaf, LockKeyhole, NotebookPen, Utensils, Wheat, Droplets, Dumbbell } from 'lucide-react'
import type { DietPlanDto, UserDietPlanDto } from '../../types/dietPlan'
import './dietPlanDetails.css'

const number = (value?: number | null) => value == null ? '—' : value.toLocaleString()
const date = (value?: string | null) => {
  if (!value) return 'Ongoing'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DietPlanDetails({ plan, assignment }: { plan: DietPlanDto; assignment: UserDietPlanDto }) {
  const meals = [...(plan.dietMeals ?? [])].sort((a, b) => a.mealOrder - b.mealOrder)
  const foodCount = meals.reduce((total, meal) => total + meal.dietMealItems.length, 0)
  const macros = [
    { label: 'Protein', value: plan.proteinGrams, color: 'protein', icon: Dumbbell, energy: 4 },
    { label: 'Carbs', value: plan.carbsGrams, color: 'carbs', icon: Wheat, energy: 4 },
    { label: 'Fats', value: plan.fatsGrams, color: 'fats', icon: Droplets, energy: 9 },
  ]
  const macroEnergy = macros.reduce((total, macro) => total + (macro.value ?? 0) * macro.energy, 0)
  const hasMacroSplit = macros.every((macro) => macro.value != null && macro.value >= 0) && macroEnergy > 0
  let angle = 0
  const segments = macros.map((macro) => {
    const start = angle
    angle += hasMacroSplit ? ((macro.value ?? 0) * macro.energy / macroEnergy) * 100 : 0
    return `var(--diet-${macro.color}) ${start}% ${angle}%`
  })

  return <div className="diet-detail space-y-6">
    <section className="diet-hero">
      <div className="diet-hero-main">
        <div className="diet-eyebrow"><Leaf size={14} aria-hidden="true" /> YOUR NUTRITION PLAN</div>
        <h3 className="diet-title">{plan.planName}</h3>
        <div className="diet-badges">
          <span className="diet-goal"><span aria-hidden="true">↗</span> {plan.goalType || 'Nutrition'}</span>
          <span className="diet-status"><span className={assignment.isActive ? 'diet-status-dot active' : 'diet-status-dot'} />{assignment.isActive ? 'Active assignment' : 'Inactive assignment'}</span>
          {!plan.isActive && <span className="diet-status">Plan inactive</span>}
        </div>
        {plan.description && <p className="diet-description">{plan.description}</p>}
        <div className="diet-plan-counts"><Utensils size={14} aria-hidden="true" /><span>{meals.length} {meals.length === 1 ? 'meal' : 'meals'}</span><span aria-hidden="true">·</span><span>{foodCount} food {foodCount === 1 ? 'item' : 'items'}</span><span className="diet-readonly"><LockKeyhole size={12} aria-hidden="true" /> Read only</span></div>
      </div>
      <div className="diet-energy">
        <div className="diet-ring" style={{ background: hasMacroSplit ? `conic-gradient(from -90deg, ${segments.join(', ')})` : 'var(--diet-border)' }}>
          <div className="diet-ring-center">
            <Flame size={20} className="diet-flame" aria-hidden="true" />
            <span className="diet-calorie-value">{number(plan.calories)}</span>
            <span className="diet-calorie-label">kcal / day</span>
          </div>
        </div>
        <p className="diet-energy-caption">Daily calorie target</p>
      </div>
    </section>

    <section aria-label="Daily nutrition targets" className="space-y-3">
      <div className="diet-section-heading"><h4>Daily nutrition targets</h4><span>Planned intake</span></div>
      <div className="diet-macros">
        {macros.map(({ label, value, color, icon: Icon, energy }) => <div key={label} className={`diet-macro diet-tone-${color}`}>
          <div className="diet-macro-label"><span className="diet-macro-icon"><Icon size={15} aria-hidden="true" /></span>{label}</div>
          <div className="diet-macro-value"><strong>{number(value)}</strong><span>g / day</span></div>
          <div className="diet-macro-track" aria-hidden="true"><span style={{ width: hasMacroSplit ? `${(value ?? 0) * energy / macroEnergy * 100}%` : '0%' }} /></div>
        </div>)}
      </div>
      {hasMacroSplit && <p className="diet-caption">Ring and bars show the energy split from protein, carbs, and fats.</p>}
    </section>

    <section className="diet-assignment" aria-label="Assignment dates">
      <span className="diet-calendar"><CalendarDays size={18} aria-hidden="true" /></span>
      <div><span className="diet-meta-label">START DATE</span><p>{date(assignment.startDate)}</p></div>
      <div className="diet-date-divider" aria-hidden="true" />
      <div><span className="diet-meta-label">END DATE</span><p>{date(assignment.endDate)}</p></div>
      <span className="diet-assignment-label"><Check size={13} aria-hidden="true" /> Assigned plan</span>
    </section>

    {assignment.notes && <aside className="diet-note">
      <NotebookPen size={18} aria-hidden="true" />
      <div><h4>Assignment notes</h4><p>{assignment.notes}</p></div>
    </aside>}

    <section className="space-y-4" aria-label="Meals and foods">
      <div className="diet-section-heading"><div><span className="diet-eyebrow">THE DAILY MENU</span><h4 className="diet-menu-title">Meals & foods</h4></div><span className="diet-meal-count">{meals.length} {meals.length === 1 ? 'meal' : 'meals'}</span></div>
      {!meals.length && <div className="diet-empty"><Utensils size={26} aria-hidden="true" /><h5>Your menu is on its way</h5><p>No meals added to this plan.</p></div>}
      {meals.map((meal, index) => {
        const items = meal.dietMealItems
        const mealCalories = items.length && items.every((item) => item.calories != null)
          ? items.reduce((total, item) => total + (item.calories ?? 0), 0) : null
        return <article key={meal.id} className="diet-meal">
          <header className="diet-meal-header">
            <span className="diet-meal-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0 flex-1"><h5>{meal.mealName}</h5><p>{items.length} food {items.length === 1 ? 'item' : 'items'}</p></div>
            {mealCalories != null && <span className="diet-meal-calories"><Flame size={13} aria-hidden="true" />{number(mealCalories)} kcal</span>}
          </header>
          {!items.length ? <p className="diet-caption px-5 py-4">No foods added to this meal.</p> : <>
            <div className="diet-food-columns" aria-hidden="true"><span>FOOD & PORTION</span><span>PROTEIN</span><span>CARBS</span><span>FATS</span><span>KCAL</span></div>
            <ul className="diet-food-list">
              {items.map((item) => <li key={item.id} className="diet-food">
                <div className="diet-food-name"><span className="diet-food-dot" aria-hidden="true" /><div><h6>{item.foodName}</h6><p>{item.quantity || 'Portion not specified'}</p></div></div>
                {[{ label: 'Protein', value: item.proteinGrams, tone: 'protein' }, { label: 'Carbs', value: item.carbsGrams, tone: 'carbs' }, { label: 'Fats', value: item.fatsGrams, tone: 'fats' }].map((macro) => <div key={macro.label} className={`diet-food-macro diet-tone-${macro.tone}`}><span className="diet-food-mobile-label">{macro.label} </span><span>{number(macro.value)}</span><small> g</small></div>)}
                <div className="diet-food-kcal"><span>{number(item.calories)}</span><small className="diet-food-mobile-label"> kcal</small></div>
              </li>)}
            </ul>
          </>}
        </article>
      })}
      <p className="diet-menu-footnote"><LockKeyhole size={13} aria-hidden="true" /> Planned meals from the assigned diet. These values do not record food consumed.</p>
    </section>
  </div>
}
