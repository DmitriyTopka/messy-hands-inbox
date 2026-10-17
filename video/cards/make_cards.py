from PIL import Image, ImageDraw, ImageFont
W,H=1920,1080
BG=(22,24,30); FG=(245,246,250); MUTED=(160,166,180); ACC=(120,240,160)
def font(sz,bold=False):
    return ImageFont.truetype('/System/Library/Fonts/Avenir Next.ttc', sz, index=(0 if bold else 7) if False else (2 if bold else 0))
def card(name, title, lines, accent=None, kicker=None):
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    y=300
    if kicker:
        d.text((160,y-90),kicker,font=font(40,True),fill=ACC); 
    d.text((160,y),title,font=font(96,True),fill=FG); y+=170
    for ln in lines:
        d.text((160,y),ln,font=font(52),fill=MUTED); y+=80
    d.ellipse((160,H-150,190,H-120),fill=ACC)
    d.text((210,H-158),'Learn AR with SPECS',font=font(36),fill=MUTED)
    im.save(name)
card('c1_title.png','Messy Hands Inbox',['A Spectacles Lens for the moment your hands are busy.'],kicker='LEARN AR WITH SPECS')
card('c2_problem.png','Hands in dough.',['Three people text at once.','The phone stays out of reach.'],kicker='THE MOMENT')
card('c3_plan.png','Planned, then built by agents',['plan-lens interview  >  design brief  >  CLAD in Lens Studio','Brief: where the card sits, how I act, 5 done criteria.'],kicker='HOW IT WAS MADE')
card('c5_design.png','Designed for glasses',['Card sits next to the work, never on it.','Every voice command has a big pinch button.','Large near-white text: black shows as clear.'],kicker='DESIGN CHOICES')
card('c6_tests.png','6 of 6 LEAF tests pass',['All five done criteria, plus a reach test','for a standing user.'],kicker='VERIFIED')
card('c7_outro.png','Look. Speak. Keep cooking.',['Messy Hands Inbox'],kicker='')
