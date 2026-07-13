import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ErrorState } from '@/components/Shared'
import { useDining } from '@/lib/hooks/useDining'
import type { DiningHall, DiningMenu } from '@/api'

function OpenBadge({ isOpen }: { isOpen: boolean | null }) {
  if (isOpen === null) return <Badge variant="secondary">hours unknown</Badge>
  return isOpen ? <Badge variant="success">open</Badge> : <Badge variant="destructive">closed</Badge>
}

function MenuView({ menu }: { menu: DiningMenu }) {
  if (menu.meals.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">No menu posted for today.</p>
  }
  return (
    <Tabs defaultValue={menu.meals[0].name} className="mt-3">
      <TabsList>
        {menu.meals.map((meal) => (
          <TabsTrigger key={meal.name} value={meal.name}>
            {meal.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {menu.meals.map((meal) => (
        <TabsContent key={meal.name} value={meal.name}>
          <Accordion type="single" collapsible>
            {meal.stations.map((station) => (
              <AccordionItem key={station.name} value={station.name}>
                <AccordionTrigger>{station.name}</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {station.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      ))}
    </Tabs>
  )
}

function HallCard({
  hall,
  index,
  expanded,
  onToggle,
  menuState,
  onRetryMenu,
}: {
  hall: DiningHall
  index: number
  expanded: boolean
  onToggle: () => void
  menuState: ReturnType<typeof useDining>['menus'][string] | undefined
  onRetryMenu: () => void
}) {
  return (
    <Card
      className="animate-fade-up cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onToggle}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{hall.name}</CardTitle>
          {hall.hours_today && <p className="mt-1 text-xs text-muted-foreground">{hall.hours_today}</p>}
        </div>
        <OpenBadge isOpen={hall.is_open} />
      </CardHeader>
      {expanded && (
        <CardContent onClick={(e) => e.stopPropagation()}>
          {(!menuState || menuState.status === 'loading') && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {menuState?.status === 'error' && <ErrorState message={menuState.message} onRetry={onRetryMenu} />}
          {menuState?.status === 'ready' && <MenuView menu={menuState.data} />}
        </CardContent>
      )}
    </Card>
  )
}

export default function Dining() {
  const { halls, load, expanded, menus, loadMenu, toggle } = useDining()

  return (
    <div className="page-enter container py-8">
      <h1 className="text-2xl font-bold text-primary sm:text-3xl">Dining</h1>
      <p className="mt-1 text-muted-foreground">Hours and menus for Virginia Tech dining halls.</p>

      <div className="mt-6">
        {halls.status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}
        {halls.status === 'error' && <ErrorState message={halls.message} onRetry={load} />}
        {halls.status === 'ready' &&
          (halls.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dining halls found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {halls.data.map((hall, i) => (
                <HallCard
                  key={hall.location_num}
                  hall={hall}
                  index={i}
                  expanded={expanded === hall.location_num}
                  onToggle={() => toggle(hall)}
                  menuState={menus[hall.location_num]}
                  onRetryMenu={() => loadMenu(hall.location_num)}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}
