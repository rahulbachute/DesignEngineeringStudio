// Explicit reference keys from the assignments' stated givens and equations.
// No placeholder/hint parsing, completion credit or evaluation-template scores are used.
const fs=require('node:fs');
const pi=Math.PI,cos=x=>Math.cos(x*pi/180),tan=x=>Math.tan(x*pi/180);
const torque=(kw,rpm)=>60e6*kw/(2*pi*rpm);
const keys={};
function put(slug,activity,values){((keys[slug]??={})[activity]??={});Object.assign(keys[slug][activity],values);}
const Tk=torque(22,1440);
put('Keys','design-requirements',{reqPower:22,reqSpeed:1440,reqShaftDia:40,reqKeyLength:45});
put('Keys','key-design-calculation',{transmittedTorque:Tk,tangentialForce:2*Tk/40,minKeyLength:Math.max(2*Tk/(40*10*(180/2.5)),4*Tk/(40*10*(360/2.5)))});
put('Keys','failure-analysis-safety',{actualShearStress:2*Tk/(40*10*45),actualCrushingStress:4*Tk/(40*10*45),factorOfSafety:180/(2*Tk/(40*10*45))});
put('cotter-joint','torque-calculation',{torque:600*175,tangentialForce:2*600*175/16});
put('cotter-joint','cotter-design-calculation',{shearStress:13125/(2*12*8),bearingStress:13125/(12*8)});
put('cotter-joint','strength-safety-check',{actualFosShear:75/(13125/(2*12*8)),actualFosCrush:150/(13125/(12*8))});
put('kunckle joint','load-turning-analysis',{straightPull:3000*9.81/1000,resultantPull:3000*9.81/1000/cos(30)});
put('kunckle joint','knuckle-design-calculation',{pinShearStress:34000/(2*pi/4*25**2),eyeTensileStress:34000/((50-25)*30),eyeBearingStress:34000/(25*30)});
put('kunckle joint','failure-safety-check',{actualFosPin:75/(34000/(2*pi/4*25**2)),actualFosEye:90/(34000/((50-25)*30))});
const wahl=(4*6-1)/(4*6-4)+.615/6,tau=wahl*8*1250*48/(pi*8**3);
put('helical-spring-design','design-requirements',{maxLoad:1250,maxDeflection:45,shearModulus:78500});
put('helical-spring-design','spring-geometry',{meanDiameter:48,outerDiameter:56,innerDiameter:40});
put('helical-spring-design','spring-design-calculation',{wahlFactor:wahl,shearStress:tau,activeCoils:78500*8**4*45/(8*1250*48**3)});
put('helical-spring-design','strength-deflection-check',{actualFos:450/tau,springStiffness:1250/45});
put('leaf-spring-design','engineering-model',{centralLoad:20,endReaction:10,semiSpan:500});
put('leaf-spring-design','design-requirements',{totalLeaves:10,leafWidth:60,leafThickness:8});
put('leaf-spring-design','bending-stress-verification',{maxBendingMoment:10*500,sectionModulus:10*60*8**2/6,calculatedBendingStress:6*10000*500/(10*60*8**2)});
put('leaf-spring-design','deflection-safety-check',{calculatedDeflection:6*10000*500**3/(207000*10*60*8**3),actualFos:900/(6*10000*500/(10*60*8**2))});
// TS-01 helical gears: stated 15 kW, 1440/480 rpm, 18/54 teeth, mn=4 mm, psi=20 degrees.
const z1v=18/cos(20)**3,z2v=54/cos(20)**3,Y1=.484-2.87/z1v,Y2=.484-2.87/z2v,d1=18*4/cos(20),d2=54*4/cos(20),T1=torque(15,1440),v1=pi*d1*1440/60000,Cv1=5.6/(5.6+Math.sqrt(v1)),Pt1=2*T1/d1,Peff1=1.25*1.3*Pt1/Cv1,Sb1=4*40*200*Y2,Sw1=40*1.5*d1/cos(20)**2;
put('helical-gear-design','gear-geometry',{pinion_torque:T1,transmission_ratio:3,z1_virtual:z1v,z2_virtual:z2v,lewis_Y1:Y1,lewis_Y2:Y2,d1,d2,centre_distance:(d1+d2)/2});
put('helical-gear-design','material-selection',{sigma_b1:800/3,sigma_b2:200,pinion_strength_factor:800/3*Y1,gear_strength_factor:200*Y2});
put('helical-gear-design','helical-force-understanding',{pitch_velocity:v1,velocity_factor_Cv:Cv1,tangential_load:Pt1,effective_load:Peff1});
put('helical-gear-design','strength-calculation',{beam_strength_Sb:Sb1,initial_FOS_bending:Sb1/Peff1,ratio_factor_Q:1.5,load_stress_factor_K:1,wear_strength_Sw:Sw1,initial_FOS_wear:Sw1/Peff1});
// TS-02 spur gears: stated 11 kW, 960/320 rpm, 20/60 teeth, module 4 mm.
const T2=torque(11,960),v2=pi*80*960/60000,Cv2=5.6/(5.6+Math.sqrt(v2)),Pt2=2*T2/80,Peff2=1.5*1.25*Pt2/Cv2,Yp=.484-2.87/20,Yg=.484-2.87/60,Sb2=4*40*200*Yg,Cv2C=5.6/(5.6+Math.sqrt(pi*100*960/60000)),Peff2C=1.5*1.25*(2*T2/100)/Cv2C;
put('spur-gear-design','transmission-requirements',{transmission_ratio:3,pinion_torque:T2,gear_torque:T2*3});
put('spur-gear-design','spur-gear-geometry',{d1:80,d2:240,centre_distance:160});
put('spur-gear-design','material-and-failure',{sigma_b1:800/3,sigma_b2:200});
put('spur-gear-design','lewis-beam-strength',{lewis_Y1:Yp,lewis_Y2:Yg,pinion_strength_product:800/3*Yp,gear_strength_product:200*Yg,beam_strength_Sb:Sb2,FOS_bending:Sb2/Peff2});
put('spur-gear-design','velocity-and-dynamic-loading',{pitch_velocity:v2,velocity_factor_Cv:Cv2,tangential_load:Pt2,effective_load:Peff2});
put('spur-gear-design','buckingham-wear-strength',{ratio_factor_Q:1.5,load_stress_factor_K:1,wear_strength_Sw:4800,FOS_wear:4800/Peff2});
put('spur-gear-design','parametric-redesign',{option_A_Sw:7200,option_A_FOSw:7200/Peff2,option_B_K:2.56,option_B_Sw:12288,option_B_FOSw:12288/Peff2,option_C_d1:100,option_C_Peff:Peff2C,option_C_Sw:9000,option_C_FOSw:9000/Peff2C});
// TS-04 automotive reverse gears: stated 8 kW, 1200/400 rpm, module 3 mm, 20/60 teeth.
const T4=torque(8,1200),Pt4=2*T4/60,v4=pi*60*1200/60000,Cv4=6/(6+v4),Peff4=1.5*1.25*Pt4/Cv4;
put('automotive-spur-gear-analysis','transmission-kinematics',{gear_ratio:3,input_torque_T1:T4,pitch_diameter_d1:60,pitch_diameter_d2:180,centre_distance_a:120});
put('automotive-spur-gear-analysis','spur-gear-forces',{tangential_force_Pt:Pt4,radial_force_Pr:Pt4*tan(20),normal_tooth_force_Pn:Pt4/cos(20)});
put('automotive-spur-gear-analysis','dynamic-loading',{pitch_line_velocity_v:v4,velocity_factor_Cv:Cv4,effective_load_Peff:Peff4});
put('automotive-spur-gear-analysis','lewis-beam-strength',{permissible_stress_sigma_b1:700/3,permissible_stress_sigma_b2:200,lewis_form_factor_Y1:.320,lewis_form_factor_Y2:.421,weaker_member:['Pinion'],beam_strength_Sb1:11200,beam_strength_Sb2:12630,bending_FOS:11200/Peff4,bending_adequacy:['Safe','Adequate']});
put('automotive-spur-gear-analysis','buckingham-wear-analysis',{ratio_factor_Q:1.5,load_stress_factor_K:1.96,wear_strength_Sw:8820,wear_FOS:8820/Peff4,wear_adequacy:['Unsafe','Not safe','Not adequate']});
const mcqAnswers={'helical-gear-design':{'material-selection':'gear'},'spur-gear-design':{'material-and-failure':'optA','failure-diagnosis':'optA'},'automotive-spur-gear-analysis':{'failure-diagnosis':'optA','gear-adequacy-assessment':'optA'}};
for(const [slug,activities] of Object.entries(keys)) {
 const file='assignments/'+slug+'/content.json',content=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const [id,fields] of Object.entries(activities))for(const [name,expected] of Object.entries(fields)) {
  const field=content.activities[id].fields.find(f=>(f.id||f.name)===name);
  if(!field)throw Error(slug+'/'+id+'/'+name+' is not declared');
  if(Array.isArray(expected))field.acceptedAnswers=expected;
  else {field.expected=expected;field.tolerance=Math.max(.005,Math.abs(expected)*.01);field.assessmentBasis='Stated assignment givens and equations; 1% numeric tolerance (minimum 0.005).';}
 }
 for(const [id,answer] of Object.entries(mcqAnswers[slug]||{}))content.activities[id].mcq.correctAnswer=answer;
 fs.writeFileSync(file,JSON.stringify(content,null,2)+'\n');fs.copyFileSync(file,'outputs/meilp/'+file);
}
