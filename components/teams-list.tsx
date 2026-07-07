"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EditTeamDialog } from "@/components/edit-team-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { teamsAPI } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface Team {
  id: string
  name: string
  description: string
  department: string
  members: string[]
  leaderId?: string
  leaderName?: string
}

interface TeamsListProps {
  teams: Team[]
  onUpdate: () => void
}

export function TeamsList({ teams, onUpdate }: TeamsListProps) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) {
      return
    }

    try {
      await teamsAPI.delete(id)
      toast({
        title: "Success",
        description: "Team has been deleted successfully",
      })
      onUpdate()
    } catch (error) {
      console.error("Error deleting team:", error)
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      })
    }
  }

  if (teams.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No teams found. Create your first team to get started.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Mobile View */}
      <div className="block space-y-2 md:hidden">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardContent className="p-2">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{team.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {team.description}
                    </p>
                  </div>
                  <Badge variant="secondary">{team.department}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {team.members?.length || 0} members
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTeam(team)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium text-base">{team.name}</TableCell>
                <TableCell className="text-sm">{team.description}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{team.department}</Badge>
                </TableCell>
                <TableCell>{team.members?.length || 0}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTeam(team)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditTeamDialog
        team={editingTeam}
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
        onSuccess={onUpdate}
      />
    </div>
  )
} 