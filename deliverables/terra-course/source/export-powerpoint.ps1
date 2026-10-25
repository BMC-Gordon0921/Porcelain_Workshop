$ErrorActionPreference = 'Stop'
$presentationRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$manifest = Get-Content -LiteralPath (Join-Path $presentationRoot 'source/manifest.json') -Encoding UTF8 -Raw | ConvertFrom-Json
if (-not $manifest.decks -or $manifest.decks.Count -eq 0) { throw 'Manifest has no decks to export' }
$powerPoint = New-Object -ComObject PowerPoint.Application
$findings = @()
try {
    foreach ($entry in $manifest.decks) {
        $file = Join-Path $presentationRoot $entry.file
        $pdf = [IO.Path]::ChangeExtension($file, '.pdf')
        $folder = Join-Path $presentationRoot $entry.folder
        $deck = $powerPoint.Presentations.Open($file, -1, 0, 0)
        try {
            if ($deck.Slides.Count -ne $entry.slides.Count) { throw 'Unexpected slide count' }
            $deck.SaveAs($pdf, 32)
            for ($i = 1; $i -le $deck.Slides.Count; $i++) {
                $slide = $deck.Slides.Item($i)
                $png = Join-Path $folder ($entry.slides[$i - 1] + '.png')
                $slide.Export($png, 'PNG', 1920, 1080)
                foreach ($shape in $slide.Shapes) {
                    if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
                        $range = $shape.TextFrame2.TextRange
                        if ($range.BoundHeight -gt $shape.Height + 5 -or $range.BoundWidth -gt $shape.Width + 5) {
                            $findings += [PSCustomObject]@{file=$entry.file;slide=$i;text=$range.Text;boxWidth=$shape.Width;boxHeight=$shape.Height;textWidth=$range.BoundWidth;textHeight=$range.BoundHeight}
                        }
                    }
                }
                Write-Output ('Exported ' + $entry.folder + ' page ' + $i)
            }
        } finally { $deck.Close() }
    }
} finally {
    # Do not close any presentations belonging to the user.
    if ($powerPoint.Presentations.Count -eq 0) { $powerPoint.Quit() }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
}
ConvertTo-Json -InputObject @($findings) -Depth 6 | Set-Content -LiteralPath (Join-Path $presentationRoot 'source/powerpoint-audit.json') -Encoding UTF8
Write-Output ('Text overflow findings: ' + $findings.Count)
